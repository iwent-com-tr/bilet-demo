import axios from "axios";
import PageHeader from "components/layouts/PageHeader";
import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import instagramIcon from "../../assets/social-media/instagram.png";
import tiktokIcon from "../../assets/social-media/tiktok.png";
import youtubeIcon from "../../assets/social-media/youtube.png";
import xIcon from "../../assets/social-media/x.png";
import approved from "../../assets/approved.png";
import VenuesEventList from "./VenuesEventList";
import "./VenuesDetail.css";
import MobileNavbar from "components/layouts/MobileNavbar";

interface Venue {
    id: string,
    name: string;
    slug: string;
    address: string;
    city: string;
    banner: string;
    capacity: number;
    seatedCapacity: number;
    standingCapacity: number;
    socialMedia: {
        instagram?: string;
        x?: string;
        youtube?: string;
        tiktok?: string;
    };
    details: string;
    accessibility: object;
    mapsLocation: string;
    approved: boolean;
    favoriteCount: number;
    deletedAt: Date;
    events: string[];
}

const VenuesDetail: React.FC = () => {

    const venue = useRef<Venue | null>(null);
    const venueStats = useRef<any>(null);

    const { slug } = useParams();

    const [loading, setLoading] = useState(true);
    async function getVenue() {
        const dbVenue = await axios.get(`${process.env.REACT_APP_API_URL}/venues/slug/${slug}`);
        if (dbVenue.status === 200) {
            venue.current = dbVenue.data as Venue;
        }
        setLoading(false);
    }

    useEffect( () => { 
        getVenue();
    }, [])

    if (venue.current === null) return (
        <div className="venues-detail">
            <PageHeader title="Mekan Detayları" />
            <h1 className="venues-detail__not-found">Mekan Bulunamadı</h1>
        </div>
    );

    return (
        <div className="venues-detail">
            <PageHeader title="Mekan Detayları" />
            <div className="venues-detail__content">
                <div className="venues-detail__approved-wrapper">
                    {venue.current?.approved && <img src={approved} alt="Approved" className="venues-detail__approved" />}
                </div>
                <div className="venue-banner-wrapper">
                    <img src={venue.current?.banner} alt={venue.current?.name} className="venue-banner" />
                </div>
                <div className="venue-details">
                    <h2 className="venue-detail__name">{venue.current?.name + ' - Etkinlik Mekanı'}</h2>
                    <div className="venue-socials">
                        {venue.current?.socialMedia.instagram && (
                            <a href={venue.current?.socialMedia.instagram} target="_blank" rel="noopener noreferrer" className="venue-socials__icon-wrapper">
                                <img src={instagramIcon} alt="Instagram" className="venue-socials__icon" />
                            </a>
                        )}
                        {venue.current?.socialMedia.x && (
                            <a href={venue.current?.socialMedia.x} target="_blank" rel="noopener noreferrer" className="venue-socials__icon-wrapper">
                                <img src={xIcon} alt="X" className="venue-socials__icon" />
                            </a>
                        )}
                        {venue.current?.socialMedia.youtube && (
                            <a href={venue.current?.socialMedia.youtube} target="_blank" rel="noopener noreferrer" className="venue-socials__icon-wrapper">
                                <img src={youtubeIcon} alt="Youtube" className="venue-socials__icon" />
                            </a>
                        )}
                        {venue.current?.socialMedia.tiktok && (
                            <a href={venue.current?.socialMedia.tiktok} target="_blank" rel="noopener noreferrer" className="venue-socials__icon-wrapper">
                                <img src={tiktokIcon} alt="TikTok" className="venue-socials__icon" />
                            </a>
                        )}
                    </div>
                    <div className="venue-stats">
                        <span className="venue-details-text">{venue.current?.events.length}<br />Etkinlik</span>
                        <span className="venue-details-text">{venue.current?.favoriteCount}<br />Takipçi</span>
                        <span className="venue-details-text">Son Ayda<br />{venueStats.current}<br />Katılımcı</span>
                    </div>
                    <div className="venue-additional">
                        <h1 className="venue-additional__address">{venue.current?.address + ', ' + venue.current?.city}</h1>
                        <p className="venue-additional__details">{venue.current?.details}</p>
                    </div>
                </div>
            </div>
            <div className="follow-button-wrapper">
                <button className="follow-button">Takip Et</button>
            </div>
            <VenuesEventList eventIds={venue.current?.events} />
        <MobileNavbar />
        </div>
    );
};

export default VenuesDetail;