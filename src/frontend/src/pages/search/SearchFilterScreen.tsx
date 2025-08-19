import { act, useContext, useState } from "react";
import { FilterContext, SearchContext } from "./Search";
import "./SearchFilterScreen.css"
import backIcon from "../../assets/back-icon.png"
import { citiesData } from "constants/cities";
import { set } from "date-fns";
import { ConferenceIcon, EducationIcon, FestivalIcon, MusicIcon, SportsIcon, TheaterIcon, UniversityIcon, WorkshopIcon } from "components/icons/CategoryIcons";

const sortedCities = [...citiesData].sort((a, b) => a.name.localeCompare(b.name, 'tr'));

const eventCategories = [
  'CONCERT',
  'FESTIVAL',
  'UNIVERSITY',
  'WORKSHOP',
  'CONFERENCE',
  'SPORT',
  'PERFORMANCE',
  'EDUCATION'
];

const FilterScreen: React.FC = () => {

    const [isFilterScreenOn, setIsFilterScreenOn] = useContext(SearchContext);
    const [activeDate, setActiveDate] = useState<any>(null);
    const [city, setCity] = useState<any>("");
    const [activeCategories, setActiveCategories] = useState<any>(Array(8).fill(false));
    const [resetPressed, setResetPressed] = useState(false);
    const [applyPressed, setApplyPressed] = useState(false);

    // FILTER RELATED

    const [filters, setFilters] = useContext(FilterContext);

    function handleDateClick(event: React.MouseEvent<HTMLButtonElement>) {
        const key = event.currentTarget.getAttribute("data-category");
        const keyNumber = parseInt(key as any);

        if (keyNumber === activeDate) {
            setActiveDate(null);
        } else {
            setActiveDate(keyNumber);
        }
    }

    function handleCityChange(event: any) {
        console.log(event.target.value);
        setCity(event.target.value);
    }

    function handleCategoryClick(event: any) {
        const key = event.currentTarget.getAttribute("data-category");
        const keyNumber = parseInt(key as any);

        setActiveCategories((prevActiveCategories: any) => {
            const updatedActiveCategories = [...prevActiveCategories];
            updatedActiveCategories[keyNumber] = !updatedActiveCategories[keyNumber];
            return updatedActiveCategories;
        });
    }

    function handleResetClick() {
        setActiveDate(null);
        setCity("");
        setActiveCategories(Array(8).fill(false));
    }

    function handleApplyClick() {
        let startDate = "", endDate = "";

        if (activeDate) {
            const today = new Date();
            const tomorrow = new Date(today.getDate() + 1);
            const weekLater = new Date(today.getDate() + 7);

            switch (activeDate) {
                case 0:
                    startDate = today.toISOString().split('T')[0];
                    endDate = startDate;
                    break;
                case 1:
                    startDate = tomorrow.toISOString().split('T')[0];
                    endDate = startDate
                    break;
                case 2:
                    startDate = today.toISOString().split('T')[0];
                    endDate = weekLater.toISOString().split('T')[0];
                    break;
                default:
                    break;
            }
        }

        const category = activeCategories.map((isActive: boolean, index: number) => {
            if (isActive) {
                return eventCategories[index];
            }
            return null;
        }).filter(Boolean);

        const f_city = city;

        setFilters(p => ({
            ...p,
            dateFrom: startDate,
            dateTo: endDate,
            category: category || "",
            city: f_city || "",
        }));

        setIsFilterScreenOn(false);
    }

    

    return (
        <div className={"filter-screen" + (!isFilterScreenOn ? " blocked" : "")}>
            <header className="filter-screen__header">
                <button className="filter-screen__back-button">
                    <img src={backIcon} alt="" onClick={() => setIsFilterScreenOn(false)} />
                </button>
                <h2 className="filter-screen__title">Arama Filtresi</h2>
            </header>
            <div className="filter-screen__city">
                <h3 className="filter-title">Şehir</h3>
                <select
                  id="city"
                  name="city"
                  value={city}
                  onChange={handleCityChange}
                  className={"event-list__filter-input filter-screen__city-select"
                    + ( city !== "" ? " active" : "")
                  }
                >
                  <option value="">Tümü</option>
                  {sortedCities.map((city) => (
                    <option key={city.plate} value={city.name}>
                      {city.name.charAt(0).toUpperCase() + city.name.slice(1)}
                    </option>
                  ))}
                </select>
            </div>
            <div className="filter-screen__date">
                <h3 className="filter-title">Tarih</h3>
                <div className="filter-screen__date-inputs">
                    <button 
                    className={"filter-screen__date-button" + (activeDate === 0 ? " active" : "")}
                    data-category="0"
                    onClick={handleDateClick}
                    >Bugün
                    </button>
                    <button 
                    className={"filter-screen__date-button" + (activeDate === 1 ? " active" : "")}
                    data-category="1"
                    onClick={handleDateClick}
                    >Yarın
                    </button>
                    <button 
                    className={"filter-screen__date-button" + (activeDate === 2 ? " active" : "")}
                    data-category="2"
                    onClick={handleDateClick}
                    >Bu Hafta
                    </button>
                </div>
            </div>
            <div className="filter-screen__category">
                <h3 className="filter-title">Etkinlik Kategorisi</h3>
                <div className="filter-screen__category-inputs">
                    <button 
                        className={"filter-screen__category-button" + (activeCategories[0] ? " active" : "")}
                        onClick={handleCategoryClick}
                        data-category="0">
                        <MusicIcon className="filter-screen__category-icon" />
                        Konser
                        </button>
                    <button 
                        className={"filter-screen__category-button" + (activeCategories[1] ? " active" : "")}
                        onClick={handleCategoryClick}
                        data-category="1">
                        <FestivalIcon className="filter-screen__category-icon" />
                        Festival
                        </button>
                    <button 
                        className={"filter-screen__category-button" + (activeCategories[2] ? " active" : "")}
                        onClick={handleCategoryClick}
                        data-category="2">
                        <UniversityIcon className="filter-screen__category-icon" />
                        Üniversite
                        </button>
                    <button 
                        className={"filter-screen__category-button" + (activeCategories[3] ? " active" : "")}
                        onClick={handleCategoryClick}
                        data-category="3">
                        <WorkshopIcon className="filter-screen__category-icon" />
                        Workshop
                        </button>
                    <button 
                        className={"filter-screen__category-button" + (activeCategories[4] ? " active" : "")}
                        onClick={handleCategoryClick}
                        data-category="4">
                        <ConferenceIcon className="filter-screen__category-icon" />
                        Konferans
                        </button>
                    <button 
                        className={"filter-screen__category-button" + (activeCategories[5] ? " active" : "")}
                        onClick={handleCategoryClick}
                        data-category="5">
                        <SportsIcon className="filter-screen__category-icon" />
                        Spor
                        </button>
                    <button 
                        className={"filter-screen__category-button" + (activeCategories[6] ? " active" : "")}
                        onClick={handleCategoryClick}
                        data-category="6">
                        <TheaterIcon className="filter-screen__category-icon" />
                        Sahne
                        </button>
                    <button 
                        className={"filter-screen__category-button" + (activeCategories[7] ? " active" : "")}
                        onClick={handleCategoryClick}
                        data-category="7">
                        <EducationIcon className="filter-screen__category-icon" />
                        Eğitim
                        </button>
                </div>
            </div>
            <div className="filter-screen__price">
                  <h1 className="filter-title">Fiyat (COMING SOON)</h1>
            </div>
            <div className="filter-screen__distance">
                  <h1 className="filter-title">Uzaklık (COMING SOON)</h1>
            </div>
            <div className="filter-screen__buttons">
                <button className={"filter-screen__reset-button" + (resetPressed ? " active" : "")}
                onClick={handleResetClick}
                onMouseDown={(e) => {e.preventDefault(); setResetPressed(true);}}
                onMouseUp={(e) => {e.preventDefault(); setResetPressed(false);}}
                onMouseLeave={(e) => {e.preventDefault(); setResetPressed(false);}}
                onTouchStart={(e) => {e.preventDefault(); setResetPressed(true);}}
                onTouchEnd={(e) => {setResetPressed(false);}}
                onTouchCancel={(e) => {e.preventDefault(); setResetPressed(false);}}>
                    Sıfırla
                </button>
                <button className={"filter-screen__apply-button" + (applyPressed ? " active" : "")} 
                onClick={handleApplyClick}
                onMouseDown={(e) => {e.preventDefault(); setApplyPressed(true)}}
                onMouseUp={(e) => {e.preventDefault(); setApplyPressed(false);}}
                onMouseLeave={(e) => {e.preventDefault(); setApplyPressed(false);}}
                onTouchStart={(e) => {e.preventDefault(); setApplyPressed(true);}}
                onTouchEnd={(e) => {setApplyPressed(false);}}
                onTouchCancel={(e) => {e.preventDefault(); setApplyPressed(false);}}>
                    Uygula
                </button>
            </div>
        </div>
    );
};

export default FilterScreen;