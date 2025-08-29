import axios from "axios";
import PageHeader from "components/layouts/PageHeader";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import instagramIcon from "../../assets/social-media/instagram.png";
import tiktokIcon from "../../assets/social-media/tiktok.png";
import youtubeIcon from "../../assets/social-media/youtube.png";
import xIcon from "../../assets/social-media/x.png";
import approved from "../../assets/approved.png";
import ArtistsEventList from "./ArtistsEventList";
import MobileNavbar from "components/layouts/MobileNavbar";
import { useAuth } from "context/AuthContext";
import { toast } from "react-toastify";

interface Artist {
    id: string;
    name: string;
    slug: string;
    banner: string;
    bio: string;
    approved: boolean;
    favoriteCount: number;
    deletedAt: Date | null;
    genres: string[];
    socialMedia: {
        instagram?: string;
        x?: string;
        youtube?: string;
        tiktok?: string;
    }
    events: string[];
    following: boolean;
}

const ArtistsDetail: React.FC = () => {
    const [artist, setArtist] = useState<Artist | null>(null);
    const artistStats = useRef<any>(null);
    const { isAuthenticated, user } = useAuth();
    const navigate = useNavigate();

    const { slug } = useParams();

    const [loading, setLoading] = useState(true);

    async function getArtist() {
        try {
            const dbArtist = await axios.get(`${process.env.REACT_APP_API_URL}/artists/slug/${slug}`);
            if (dbArtist.status === 200) {
                setArtist(dbArtist.data as Artist);
            } else {
                setArtist(null);
            }
        } catch (err) {
            setArtist(null);
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

        if (!artist) return;

        try {
            if (artist.following) {
                const res = await axios.delete(`${process.env.REACT_APP_API_URL}/artists/follow/${artist.id}`);
                if (res.status === 200) {
                    setArtist({
                        ...artist,
                        favoriteCount: artist.favoriteCount - 1,
                        following: false,
                    });
                }
            } else {
                const res = await axios.post(`${process.env.REACT_APP_API_URL}/artists/follow/${artist.id}`);
                if (res.status === 200) {
                    setArtist({
                        ...artist,
                        favoriteCount: artist.favoriteCount + 1,
                        following: true,
                    });
                }
            }
        } catch (error) {
            toast.error("Takip isteği sırasında bir hata oluştu.");
        }
    }

    useEffect(() => {
        getArtist();
    }, [slug]);

    if (artist === null) return (
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
                    {artist?.approved && <img src={approved} alt="Approved" className="venues-detail__approved" />}
                </div>
                <div className="venue-banner-wrapper">
                    <img src={artist?.banner} alt={artist?.name} className="venue-banner" />
                </div>
                <div className="venue-details">
                    <h2 className="venue-detail__name">{artist?.name + ' - Sanatçı'}</h2>
                    <div className="venue-socials">
                        {artist?.socialMedia.instagram && (
                            <a href={artist?.socialMedia.instagram} target="_blank" rel="noopener noreferrer" className="venue-socials__icon-wrapper">
                                <img src={instagramIcon} alt="Instagram" className="venue-socials__icon" />
                            </a>
                        )}
                        {artist?.socialMedia.x && (
                            <a href={artist?.socialMedia.x} target="_blank" rel="noopener noreferrer" className="venue-socials__icon-wrapper">
                                <img src={xIcon} alt="X" className="venue-socials__icon" />
                            </a>
                        )}
                        {artist?.socialMedia.youtube && (
                            <a href={artist?.socialMedia.youtube} target="_blank" rel="noopener noreferrer" className="venue-socials__icon-wrapper">
                                <img src={youtubeIcon} alt="Youtube" className="venue-socials__icon" />
                            </a>
                        )}
                        {artist?.socialMedia.tiktok && (
                            <a href={artist?.socialMedia.tiktok} target="_blank" rel="noopener noreferrer" className="venue-socials__icon-wrapper">
                                <img src={tiktokIcon} alt="TikTok" className="venue-socials__icon" />
                            </a>
                        )}
                    </div>
                    <div className="venue-stats">
                        <span className="venue-details-text">{artist?.events.length}<br />Etkinlik</span>
                        <span className="venue-details-text">{artist?.favoriteCount}<br />Takipçi</span>
                        <span className="venue-details-text">Son Ayda<br />{artistStats.current}<br />Katılımcı</span>
                    </div>
                    <div className="venue-additional">
                        <p className="venue-additional__details">{artist?.bio}</p>
                    </div>
                </div>
            </div>

            <div className={artist.following ? "follow-button-wrapper following" : "follow-button-wrapper"}>
                <button className={artist.following ? "follow-button following" : "follow-button"} onClick={handleFollow}>
                    {artist.following ? "Takipten Çık" : "Takip Et"}
                </button>
            </div>

            <ArtistsEventList eventIds={artist.events} />
            <MobileNavbar />
        </div>
    );
}

export default ArtistsDetail;
