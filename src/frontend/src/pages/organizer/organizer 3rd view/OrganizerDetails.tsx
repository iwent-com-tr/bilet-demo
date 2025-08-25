import axios from "axios";
import PageHeader from "components/layouts/PageHeader";
import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import instagramIcon from "../../../assets/social-media/instagram.png";
import tiktokIcon from "../../../assets/social-media/tiktok.png";
import youtubeIcon from "../../../assets/social-media/youtube.png";
import xIcon from "../../../assets/social-media/x.png";
import approved from "../../../assets/approved.png";
import OrganizerEventList from "./OrganizerEventList";
import MobileNavbar from "components/layouts/MobileNavbar";

interface Organizer {
    id: string;
    name: string;
    company: string;
    approved: boolean;
    avatar?: string;
    socialMedia: {
        instagram?: string;
        x?: string;
        youtube?: string;
        tiktok?: string;
    }
    events: string[],
    favoriteCount: number,
}

const OrganizerDetails: React.FC = () => {

  const organizer = useRef<Organizer | null>(null);
    const organizerStats = useRef<any>(null);

    const { id } = useParams();

    const [loading, setLoading] = useState(true);
    async function getOrganizer() {
        const dbOrganizer = await axios.get(`${process.env.REACT_APP_API_URL}/organizers/public/${id}`);
        if (dbOrganizer.status === 200) {
            organizer.current = dbOrganizer.data as Organizer;
        }
        setLoading(false);
    }

    useEffect( () => { 
        getOrganizer();
    }, [])

    if (organizer.current === null) return (
        <div className="venues-detail">
            <PageHeader title="Organizatör Detayları" />
            <h1 className="venues-detail__not-found">Organizatör Bulunamadı</h1>
        </div>
    );

    return (
        <div className="venues-detail">
            <PageHeader title="Organizatör Detayları" />
            <div className="venues-detail__content">
                <div className="venues-detail__approved-wrapper">
                    {organizer.current?.approved && <img src={approved} alt="Approved" className="venues-detail__approved" />}
                </div>
                <div className="venue-banner-wrapper">
                    <img src={organizer.current?.avatar} alt={organizer.current?.name} className="venue-banner" />
                </div>
                <div className="venue-details">
                    <h2 className="venue-detail__name">{organizer.current?.name + ' - Organizatör'}</h2>
                    <div className="venue-socials">
                        {organizer.current?.socialMedia.instagram && (
                            <a href={organizer.current?.socialMedia.instagram} target="_blank" rel="noopener noreferrer" className="venue-socials__icon-wrapper">
                                <img src={instagramIcon} alt="Instagram" className="venue-socials__icon" />
                            </a>
                        )}
                        {organizer.current?.socialMedia.x && (
                            <a href={organizer.current?.socialMedia.x} target="_blank" rel="noopener noreferrer" className="venue-socials__icon-wrapper">
                                <img src={xIcon} alt="X" className="venue-socials__icon" />
                            </a>
                        )}
                        {organizer.current?.socialMedia.youtube && (
                            <a href={organizer.current?.socialMedia.youtube} target="_blank" rel="noopener noreferrer" className="venue-socials__icon-wrapper">
                                <img src={youtubeIcon} alt="Youtube" className="venue-socials__icon" />
                            </a>
                        )}
                        {organizer.current?.socialMedia.tiktok && (
                            <a href={organizer.current?.socialMedia.tiktok} target="_blank" rel="noopener noreferrer" className="venue-socials__icon-wrapper">
                                <img src={tiktokIcon} alt="TikTok" className="venue-socials__icon" />
                            </a>
                        )}
                    </div>
                    <div className="venue-stats">
                        <span className="venue-details-text">{organizer.current?.events.length}<br />Etkinlik</span>
                        <span className="venue-details-text">{organizer.current?.favoriteCount}<br />Takipçi</span>
                        <span className="venue-details-text">Son Ayda<br />{organizerStats.current}<br />Katılımcı</span>
                    </div>
                    <div className="venue-additional">
                        <p className="venue-additional__details">{organizer.current?.company}</p>
                    </div>
                </div>
            </div>
            <div className="follow-button-wrapper">
                <button className="follow-button">Takip Et</button>
            </div>
            <OrganizerEventList eventIds={organizer.current?.events} />
        <MobileNavbar />
        </div>
    );
}

export default OrganizerDetails