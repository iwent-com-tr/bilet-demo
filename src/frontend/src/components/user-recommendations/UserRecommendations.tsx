import FeaturedArtists from "components/user-recommendations/FeaturedArtists";
import FeaturedEvents from "components/user-recommendations/FeaturedEvents";
import PopularArtistEvents from "components/user-recommendations/PopularArtistEvents";
import PopularOrganizers from "components/user-recommendations/PopularOrganizers";
import WeekEvents from "components/user-recommendations/WeekEvents";


const UserRecommendations: React.FC = () => {
    return (
        <div className="home-content">
        {/* Featured Events Section */}
        <FeaturedEvents />

        {/* Featured Artists Section */}
        <FeaturedArtists />

        {/* Popular Artist Events Section */}
        <PopularArtistEvents />

        {/* Popular Organizers Section */}
        <PopularOrganizers />

        {/* Week Events Section */}
        <WeekEvents />
      </div>
    );
};

export default UserRecommendations;