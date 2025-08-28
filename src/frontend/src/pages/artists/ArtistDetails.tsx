import axios from "axios";
import PageHeader from "components/layouts/PageHeader";
import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import instagramIcon from "../../assets/social-media/instagram.png";
import tiktokIcon from "../../assets/social-media/tiktok.png";
import youtubeIcon from "../../assets/social-media/youtube.png";
import xIcon from "../../assets/social-media/x.png";
import approved from "../../assets/approved.png";
import ArtistsEventList from "./ArtistsEventList";
import MobileNavbar from "components/layouts/MobileNavbar";

interface Artist {
    id: string;
    name: string;
    slug: string;
    banner: string;
    bio: string;
    approved: boolean;
    favoriteCount: number;
    deletedAt: Date;
    genres: string[];
    socialMedia: {
        instagram?: string;
        x?: string;
        youtube?: string;
        tiktok?: string;
    }
    events: string[];
}

const ArtistsDetail: React.FC = () => {
    const artist = useRef<Artist | null>(null);
    const artistStats = useRef<any>(null);

    const { slug } = useParams();

    const [loading, setLoading] = useState(true);
    async function getArtist() {
        const dbArtist = await axios.get(`${process.env.REACT_APP_API_URL}/artists/slug/${slug}`);
        if (dbArtist.status === 200) {
            artist.current = dbArtist.data as Artist;
        }
        setLoading(false);
    }

    useEffect( () => { 
        getArtist();
    }, [])

    if (artist.current === null) return (
        <div className="venues-detail">
            <PageHeader title="Sanatçı Detayları" />
            <h1 className="venues-detail__not-found">Sanatçı Bulunamadı</h1>
        </div>
    );

    return (
        <div className="venues-detail">
            <PageHeader title="Sanatçı Detayları" />
            <div className="venues-detail__content">
                <div className="venues-detail__approved-wrapper">
                    {artist.current?.approved && <img src={approved} alt="Approved" className="venues-detail__approved" />}
                </div>
                <div className="venue-banner-wrapper">
                    <img src={artist.current?.banner} alt={artist.current?.name} className="venue-banner" />
                </div>
                <div className="venue-details">
                    <h2 className="venue-detail__name">{artist.current?.name + ' - Sanatçı'}</h2>
                    <div className="venue-socials">
                        {artist.current?.socialMedia.instagram && (
                            <a href={artist.current?.socialMedia.instagram} target="_blank" rel="noopener noreferrer" className="venue-socials__icon-wrapper">
                                <img src={instagramIcon} alt="Instagram" className="venue-socials__icon" />
                            </a>
                        )}
                        {artist.current?.socialMedia.x && (
                            <a href={artist.current?.socialMedia.x} target="_blank" rel="noopener noreferrer" className="venue-socials__icon-wrapper">
                                <img src={xIcon} alt="X" className="venue-socials__icon" />
                            </a>
                        )}
                        {artist.current?.socialMedia.youtube && (
                            <a href={artist.current?.socialMedia.youtube} target="_blank" rel="noopener noreferrer" className="venue-socials__icon-wrapper">
                                <img src={youtubeIcon} alt="Youtube" className="venue-socials__icon" />
                            </a>
                        )}
                        {artist.current?.socialMedia.tiktok && (
                            <a href={artist.current?.socialMedia.tiktok} target="_blank" rel="noopener noreferrer" className="venue-socials__icon-wrapper">
                                <img src={tiktokIcon} alt="TikTok" className="venue-socials__icon" />
                            </a>
                        )}
                    </div>
                    <div className="venue-stats">
                        <span className="venue-details-text">{artist.current?.events.length}<br />Etkinlik</span>
                        <span className="venue-details-text">{artist.current?.favoriteCount}<br />Takipçi</span>
                        <span className="venue-details-text">Son Ayda<br />{artistStats.current}<br />Katılımcı</span>
                    </div>
                    <div className="venue-additional">
                        <p className="venue-additional__details">{artist.current?.bio}</p>
                    </div>
                </div>
            </div>
            <div className="follow-button-wrapper">
                <button className="follow-button">Takip Et</button>
            </div>
            <ArtistsEventList eventIds={artist.current?.events} />
        <MobileNavbar />
        </div>
    );
}

export default ArtistsDetail;