import React, { useEffect, useState } from 'react';
import './PopularOrganizers.css';

// Import images
import ares from 'assets/popular-organizators/ares.png';
import commonCulture from 'assets/popular-organizators/common-culture.png';
import heim from 'assets/popular-organizators/heim.png';
import peachGang from 'assets/popular-organizators/peach-gang.png';
import wakeUpWorks from 'assets/popular-organizators/wake-up-works.png';
import axios from 'axios';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from 'context/AuthContext';
import { toast } from 'react-toastify';

// const organizers = [
//   {
//     id: '1',
//     name: 'Ares',
//     image: ares,
//   },
//   {
//     id: '2',
//     name: 'Common Culture',
//     image: commonCulture,
//   },
//   {
//     id: '3',
//     name: 'HEIM',
//     image: heim,
//   },
//   {
//     id: '4',
//     name: 'Peach Gang',
//     image: peachGang,
//   },
//   {
//     id: '5',
//     name: 'Wake Up Works',
//     image: wakeUpWorks,
//   }
// ];

interface Organizer {
  id: string;
  firstName: string;
  lastName: string;
  avatar: string;
  following: boolean;
  favoriteCount: number;
}


const PopularOrganizers: React.FC = () => {
  const [organizers, setOrganizers] = useState<Organizer[]>([]);
  const [page, setPage] = useState(1);
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  async function handleFollow(id: string) {
  if (!isAuthenticated) {
    toast.error("Takip etmek için giriş yapmalısınız");
    navigate("/login");
    return;
  }

  if (user?.userType !== "USER") {
    toast.error("Sadece kullanıcılar takip edebilir");
    return;
  }

  const organizer = organizers.find((o) => o.id === id);

  if (!organizer) return;

  try {
    if (organizer.following) {
      const res = await axios.delete(
        `${process.env.REACT_APP_API_URL}/organizers/follow/${organizer.id}`
      );
      if (res.status === 200) {
        setOrganizers(organizers => organizers.map(o => o.id === id ? { ...o, following: false } : o));
      }
    } else {
      const res = await axios.post(
        `${process.env.REACT_APP_API_URL}/organizers/follow/${organizer.id}`
      );
      if (res.status === 200) {
        setOrganizers(organizers => organizers.map(o => o.id === id ? { ...o, following: true } : o));
      }
    }
  } catch (error) {
    toast.error("Takip isteği sırasında bir hata oluştu.");
  }
}

  useEffect(() => {
    async function fetchEvents() {
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: '6',
          q: '',
        });
        const response = await axios.get(`${process.env.REACT_APP_API_URL}/organizers/public/popular?${params}`);
        setOrganizers(response.data.data);
        console.log(response.data.data);
      } catch (error) {
        console.error('Error fetching organizers:', error);
      }
    }
    fetchEvents();
  }, []);

  return (
    <section className="popular-organizers">
      <div className="popular-organizers__header">
        <h2 className="popular-organizers__title">→ Popüler Organizatörler</h2>
      </div>
      <div className="popular-organizers__grid-container">
        <div className="popular-organizers__grid">
          {organizers.map(organizer => (
            <div key={organizer.id} className="popular-organizers__card">
              <Link to={`/organizer/${organizer.id}`} className="popular-organizers__image-link">
                <div className="popular-organizers__image-container">
                  <img src={organizer.avatar} alt={`${organizer.firstName} ${organizer.lastName}`} className="popular-organizers__image" />
                </div>
              </Link>
              <div className="popular-organizers__content">
                <h3 className="popular-organizers__name">{`${organizer.firstName} ${organizer.lastName}`}</h3>
                <button 
                  className={"popular-organizers__follow-button" + (organizer.following ? " following" : "")}
                  onClick={async () => handleFollow(organizer.id)}>
                  {organizer.following ? 'Takip ediyorsun' : 'Takip Et'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PopularOrganizers; 