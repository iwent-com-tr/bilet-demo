import "./SearchHeader.css"
import searchIcon from "../../assets/search-icon.png"
import filterIconWhite from "../../assets/filter-icon.png"
import filterIconBlack from "../../assets/filter-icon-negro.png"
import { useState, useContext, useRef, useEffect } from "react"
import { SearchContext, FilterContext } from "./Search"

const SearchHeader: React.FC = () => {
    const [isFilterScreenOn, setIsFilterScreenOn] = useContext(SearchContext);
    const [filters, setFilters] = useContext(FilterContext);
    const [isSearchBarFocused, setIsSearchBarFocused] = useState(false);
    const [activeCategory, setActiveCategory] = useState<null | number>(null);
    const [isFilterOn, setIsFilterOn] = useState(false);

    function manageActiveCategory(event: React.MouseEvent<HTMLButtonElement>) {
        const key = event.currentTarget.getAttribute("data-category");
        if (key === null) return;

        const keyNumber = parseInt(key);
        if (keyNumber === activeCategory) {
            setActiveCategory(null);
        } else {
            setActiveCategory(keyNumber);
        }
    }

    useEffect(() => {
        setIsFilterOn(!!(filters.q || filters.category.length || filters.city || filters.dateFrom || filters.dateTo));
        console.log(filters)
    }, [filters]);

    function filterClicked() {
        setIsFilterScreenOn(true);
    }

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { value } = e.target;
        setFilters({ ...filters, q: value });
      };

    

    return (
        <header className={"search-header" + (isFilterScreenOn ? " blocked" : "")}>
            <div className="search-header__head">
                <div className={"search-header__search-bar" + (isSearchBarFocused ? " is-focused" : "")}> 
                    <div className="search-header__search-icon-wrapper">
                        <img src={searchIcon} alt="" />
                    </div>
                    <input 
                    onFocus={() => setIsSearchBarFocused(true)} 
                    onBlur={() => setIsSearchBarFocused(false)} 
                    onChange={handleSearchChange}
                    type="text" placeholder="Ara" className="search-header__search-input" />
                </div>
                <div className={"search-header__filter-wrapper" + (isFilterOn ? " is-active" : "")}>
                    <button 
                    onClick={filterClicked} 
                    className="search-header__filter-button">
                        <img src={isFilterOn ? filterIconBlack : filterIconWhite} alt="" />
                    </button>
                </div>
            </div>
            <div className="search-header__category-container">
                <button
                data-category="0" 
                onClick={manageActiveCategory}
                className={"search-header__category-button" + (activeCategory === 0 ? " is-active" : "")}>
                    Etkinlikler
                </button>
                <button
                data-category="1" 
                onClick={manageActiveCategory}
                className={"search-header__category-button" + (activeCategory === 1 ? " is-active" : "")}>
                    Sanatçılar
                </button>
                <button
                data-category="2" 
                onClick={manageActiveCategory}
                className={"search-header__category-button" + (activeCategory === 2 ? " is-active" : "")}>
                    Mekanlar
                </button>
                <button
                data-category="3" 
                onClick={manageActiveCategory}
                className={"search-header__category-button" + (activeCategory === 3 ? " is-active" : "")}>
                    Organizasyonlar
                </button>
            </div>
        </header>
    )
}

export default SearchHeader