import React, { useEffect, useState } from 'react';
import './FeaturedArtists.css';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from 'context/AuthContext';
import { toast } from 'react-toastify';

interface Artist {
  id: string;
  slug: string;
  name: string;
  banner?: string;
  following: boolean;
}

const FeaturedArtists: React.FC = () => {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [page, setPage] = useState<number>(1);
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  async function handleFollow(id: string) {
    if (!isAuthenticated) {
      toast.error('Takip etmek için giriş yapmalısınız');
      navigate('/login');
      return;
    }

    if (user?.userType !== 'USER') {
      toast.error('Sadece kullanıcılar takip edebilir');
      return;
    }

    const artist = artists.find((a) => a.id === id);
    if (!artist) return;

    try {
      if (artist.following) {
        const res = await axios.delete(`${process.env.REACT_APP_API_URL}/artists/follow/${artist.id}`);
        if (res.status === 200) {
          setArtists((prev) => prev.map((a) => (a.id === id ? { ...a, following: false } : a)));
        }
      } else {
        const res = await axios.post(`${process.env.REACT_APP_API_URL}/artists/follow/${artist.id}`);
        if (res.status === 200) {
          setArtists((prev) => prev.map((a) => (a.id === id ? { ...a, following: true } : a)));
        }
      }
    } catch (error) {
      toast.error('Takip isteği sırasında bir hata oluştu.');
      console.error(error);
    }
  }

  useEffect(() => {
    async function fetchArtists() {
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: '5',
          q: '',
        });

        const response = await axios.get(`${process.env.REACT_APP_API_URL}/artists/popular?${params}`);
        setArtists(response.data.data);
        console.log(response.data.data);
      } catch (error) {
        console.error('Error fetching artists:', error);
      }
    }
    fetchArtists();
  }, [page]);

  if (artists.length === 0) {
    return null;
  }

  return (
    <section className="featured-artists">
      <div className="featured-artists__header">
        <h2 className="featured-artists__title">→ Bu Yıl En Çok Dinlenen Sanatçılar</h2>
      </div>
      <div className="featured-artists__grid-container">
        <div className="featured-artists__grid">
          {artists.map((artist) => (
            <div key={artist.id} className="featured-artists__card">
              <Link to={`/artists/${artist.slug}`} className="featured-artists__image-link">
                <div className="featured-artists__image-container">
                  <img src={artist.banner} alt={artist.name} className="featured-artists__image" />
                </div>
              </Link>
              <h3 className="featured-artists__name">{artist.name}</h3>
              <button
                className={'featured-artists__follow-button' + (artist.following ? ' following' : '')}
                onClick={async () => handleFollow(artist.id)}
              >
                {artist.following ? 'Takip ediyorsun' : 'Takip Et'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturedArtists;
