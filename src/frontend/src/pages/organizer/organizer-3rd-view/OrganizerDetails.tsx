import axios from "axios";
import PageHeader from "components/layouts/PageHeader";
import React, { useEffect, useRef, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import instagramIcon from "../../../assets/social-media/instagram.png";
import tiktokIcon from "../../../assets/social-media/tiktok.png";
import youtubeIcon from "../../../assets/social-media/youtube.png";
import xIcon from "../../../assets/social-media/x.png";
import approved from "../../../assets/approved.png";
import OrganizerEventList from "../organizer-3rd-view/OrganizerEventList";
import MobileNavbar from "components/layouts/MobileNavbar";
import { useAuth } from "context/AuthContext";
import { toast } from "react-toastify";
import "./OrganizerDetails.css";

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
    following: boolean,
}

const OrganizerDetails: React.FC = () => {

    const [organizer, setOrganizer] = useState<Organizer | null>(null);
    const organizerStats = useRef<any>(null);
    const { isAuthenticated, user } = useAuth();
    const navigate = useNavigate();

    const { id } = useParams();

    const [loading, setLoading] = useState(true);

    async function getOrganizer() {
  const dbOrganizer = await axios.get(
    `${process.env.REACT_APP_API_URL}/organizers/public/${id}`
  );
  if (dbOrganizer.status === 200) {
    setOrganizer(dbOrganizer.data as Organizer);
  }
  setLoading(false);
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

  if (!organizer) return;

  try {
    if (organizer.following) {
      const res = await axios.delete(
        `${process.env.REACT_APP_API_URL}/organizers/follow/${organizer.id}`
      );
      if (res.status === 200) {
        setOrganizer({
          ...organizer,
          favoriteCount: organizer.favoriteCount - 1,
          following: false,
        });
      }
    } else {
      const res = await axios.post(
        `${process.env.REACT_APP_API_URL}/organizers/follow/${organizer.id}`
      );
      if (res.status === 200) {
        setOrganizer({
          ...organizer,
          favoriteCount: organizer.favoriteCount + 1,
          following: true,
        });
      }
    }
  } catch (error) {
    toast.error("Takip isteği sırasında bir hata oluştu.");
  }
}


    useEffect( () => { 
        getOrganizer();
    }, [])

    if (organizer === null) return (
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
                    {organizer.approved && <img src={approved} alt="Approved" className="venues-detail__approved" />}
                </div>
                <div className="venue-banner-wrapper">
                    <img src={organizer.avatar} alt={organizer.name} className="venue-banner" />
                </div>
                <div className="venue-details">
                    <h2 className="venue-detail__name">{organizer.name + ' - Organizatör'}</h2>
                    <div className="venue-socials">
                        {organizer.socialMedia.instagram && (
                            <a href={organizer.socialMedia.instagram} target="_blank" rel="noopener noreferrer" className="venue-socials__icon-wrapper">
                                <img src={instagramIcon} alt="Instagram" className="venue-socials__icon" />
                            </a>
                        )}
                        {organizer.socialMedia.x && (
                            <a href={organizer.socialMedia.x} target="_blank" rel="noopener noreferrer" className="venue-socials__icon-wrapper">
                                <img src={xIcon} alt="X" className="venue-socials__icon" />
                            </a>
                        )}
                        {organizer.socialMedia.youtube && (
                            <a href={organizer.socialMedia.youtube} target="_blank" rel="noopener noreferrer" className="venue-socials__icon-wrapper">
                                <img src={youtubeIcon} alt="Youtube" className="venue-socials__icon" />
                            </a>
                        )}
                        {organizer.socialMedia.tiktok && (
                            <a href={organizer.socialMedia.tiktok} target="_blank" rel="noopener noreferrer" className="venue-socials__icon-wrapper">
                                <img src={tiktokIcon} alt="TikTok" className="venue-socials__icon" />
                            </a>
                        )}
                    </div>
                    <div className="venue-stats">
                        <span className="venue-details-text">{organizer.events.length}<br />Etkinlik</span>
                        <span className="venue-details-text">{organizer.favoriteCount}<br />Takipçi</span>
                        <span className="venue-details-text">Son Ayda<br />{organizerStats.current}<br />Katılımcı</span>
                    </div>
                    <div className="venue-additional">
                        <p className="venue-additional__details">{organizer.company}</p>
                    </div>
                </div>
            </div>
            <div className={organizer.following ? "follow-button-wrapper following" : "follow-button-wrapper"}>
                <button className={organizer.following ? "follow-button following" : "follow-button"} onClick={handleFollow}>{organizer.following ? "Takipten Çık" : "Takip Et"}</button>
            </div>
            <OrganizerEventList eventIds={organizer.events} />
        <MobileNavbar />
        </div>
    );
}

export default OrganizerDetails