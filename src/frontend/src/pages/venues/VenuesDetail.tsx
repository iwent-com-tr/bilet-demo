import axios from "axios";
import PageHeader from "components/layouts/PageHeader";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import instagramIcon from "../../assets/social-media/instagram.png";
import tiktokIcon from "../../assets/social-media/tiktok.png";
import youtubeIcon from "../../assets/social-media/youtube.png";
import xIcon from "../../assets/social-media/x.png";
import approved from "../../assets/approved.png";
import VenuesEventList from "./VenuesEventList";
import "./VenuesDetail.css";
import MobileNavbar from "components/layouts/MobileNavbar";
import { useAuth } from "context/AuthContext";
import { toast } from "react-toastify";
import IWentMap from "components/iwent-map/IWentMap";

interface Venue {
    id: string;
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
    deletedAt: Date | null;
    events: string[];
    following?: boolean;
}

const VenuesDetail: React.FC = () => {
    const [venue, setVenue] = useState<Venue | null>(null);
    const venueStats = useRef<any>(null);

    const { slug } = useParams();
    const { isAuthenticated, user } = useAuth();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);

    async function getVenue() {
        try {
            const dbVenue = await axios.get(`${process.env.REACT_APP_API_URL}/venues/slug/${slug}`);
            console.log(dbVenue)
            if (dbVenue.status === 200) {
                setVenue(dbVenue.data as Venue);
            } else {
                setVenue(null);
            }
        } catch (err) {
            setVenue(null);
        } finally {
            setLoading(false);
        }
    }

    async function handleFollow() {
        if (!isAuthenticated) {
            toast.error("Takip etmek için giriş yapmalısınız");
            navigate("/login");
            return;
        }

        if (user?.userType !== "USER") {
            toast.error("Sadece kullanıcılar takip edebilir");
            return;
        }

        if (!venue) return;

        try {
            if (venue.following) {
                const res = await axios.delete(`${process.env.REACT_APP_API_URL}/venues/follow/${venue.id}`);
                if (res.status === 200) {
                    setVenue({
                        ...venue,
                        favoriteCount: venue.favoriteCount - 1,
                        following: false,
                    });
                }
            } else {
                const res = await axios.post(`${process.env.REACT_APP_API_URL}/venues/follow/${venue.id}`);
                if (res.status === 200) {
                    setVenue({
                        ...venue,
                        favoriteCount: venue.favoriteCount + 1,
                        following: true,
                    });
                }
            }
        } catch (error) {
            toast.error("Takip isteği sırasında bir hata oluştu.");
        }
    }

    useEffect(() => {
        getVenue();
    }, [slug]);

    if (venue === null) return (
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
                    {venue?.approved && <img src={approved} alt="Approved" className="venues-detail__approved" />}
                </div>
                <div className="venue-banner-wrapper">
                    <img src={venue?.banner} alt={venue?.name} className="venue-banner" />
                </div>
                <div className="venue-details">
                    <h2 className="venue-detail__name">{venue?.name + ' - Etkinlik Mekanı'}</h2>
                    <div className="venue-socials">
                        {venue?.socialMedia.instagram && (
                            <a href={venue?.socialMedia.instagram} target="_blank" rel="noopener noreferrer" className="venue-socials__icon-wrapper">
                                <img src={instagramIcon} alt="Instagram" className="venue-socials__icon" />
                            </a>
                        )}
                        {venue?.socialMedia.x && (
                            <a href={venue?.socialMedia.x} target="_blank" rel="noopener noreferrer" className="venue-socials__icon-wrapper">
                                <img src={xIcon} alt="X" className="venue-socials__icon" />
                            </a>
                        )}
                        {venue?.socialMedia.youtube && (
                            <a href={venue?.socialMedia.youtube} target="_blank" rel="noopener noreferrer" className="venue-socials__icon-wrapper">
                                <img src={youtubeIcon} alt="Youtube" className="venue-socials__icon" />
                            </a>
                        )}
                        {venue?.socialMedia.tiktok && (
                            <a href={venue?.socialMedia.tiktok} target="_blank" rel="noopener noreferrer" className="venue-socials__icon-wrapper">
                                <img src={tiktokIcon} alt="TikTok" className="venue-socials__icon" />
                            </a>
                        )}
                    </div>
                    <div className="venue-stats">
                        <span className="venue-details-text">{venue?.events.length}<br />Etkinlik</span>
                        <span className="venue-details-text">{venue?.favoriteCount}<br />Takipçi</span>
                        <span className="venue-details-text">Son Ayda<br />{venueStats.current}<br />Katılımcı</span>
                    </div>
                    <div className="venue-additional">
                        <h1 className="venue-additional__address">{venue?.address + ', ' + venue?.city}</h1>
                        <p className="venue-additional__details">{venue?.details}</p>
                    </div>
                </div>
            </div>

            <div className={venue.following ? "follow-button-wrapper following" : "follow-button-wrapper"}>
                <button className={venue.following ? "follow-button following" : "follow-button"} onClick={handleFollow}>
                    {venue.following ? "Takipten Çık" : "Takip Et"}
                </button>
            </div>

            <VenuesEventList eventIds={venue.events} />

            <div className='venue-map-wrapper'>
                <h2 className="event-detail__ticket-title">Mekan Konumu</h2>
                <IWentMap venueId={venue.id}/>
            </div>
            <MobileNavbar />
        </div>
    );
};

export default VenuesDetail;
