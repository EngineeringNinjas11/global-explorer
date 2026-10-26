```javascript
/* ==========================================
   GLOBAL EXPLORER — INTERACTIVE WORLD MAP
   ========================================== */

const mapElement = document.getElementById("map");

if (mapElement && typeof L !== "undefined") {

    // 1. INITIALIZE THE MAP

    const map = L.map("map", {
        center: [25, 10],
        zoom: 2,
        minZoom: 2,
        maxZoom: 7,
        worldCopyJump: true
    });

    // OpenStreetMap tiles

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
    }).addTo(map);


    // 2. COUNTRY INFORMATION DATABASE
    // Initial examples; we will expand this database later.

    const countryData = {

        "India": {
            flag: "🇮🇳",
            capital: "New Delhi",
            region: "South Asia",
            population: "1.4 billion+",
            currency: "Indian Rupee",
            description: "Explore India's education system, universities, economy, careers and lifestyle."
        },

        "Germany": {
            flag: "🇩🇪",
            capital: "Berlin",
            region: "Europe",
            population: "84 million",
            currency: "Euro",
            description: "Discover German universities, engineering programmes, career opportunities and living costs."
        },

        "Slovakia": {
            flag: "🇸🇰",
            capital: "Bratislava",
            region: "Europe",
            population: "5.4 million",
            currency: "Euro",
            description: "Explore Slovak universities, European study opportunities, accommodation and lifestyle."
        },

        "Italy": {
            flag: "🇮🇹",
            capital: "Rome",
            region: "Europe",
            population: "59 million",
            currency: "Euro",
            description: "Discover Italian universities, scholarships, regional living costs and cultural experiences."
        },

        "Hungary": {
            flag: "🇭🇺",
            capital: "Budapest",
            region: "Europe",
            population: "9.6 million",
            currency: "Hungarian Forint",
            description: "Explore Hungarian universities, international programmes, student life and living expenses."
        },

        "Canada": {
            flag: "🇨🇦",
            capital: "Ottawa",
            region: "North America",
            population: "41 million",
            currency: "Canadian Dollar",
            description: "Discover Canadian colleges, universities, career pathways and regional living costs."
        },

        "Portugal": {
            flag: "🇵🇹",
            capital: "Lisbon",
            region: "Europe",
            population: "10.6 million",
            currency: "Euro",
            description: "Explore Portuguese universities, education opportunities, lifestyle and accommodation."
        },

        "Romania": {
            flag: "🇷🇴",
            capital: "Bucharest",
            region: "Europe",
            population: "19 million",
            currency: "Romanian Leu",
            description: "Discover Romanian universities, international courses, living expenses and career opportunities."
        },

        "United States of America": {
            flag: "🇺🇸",
            capital: "Washington, D.C.",
            region: "North America",
            population: "340 million",
            currency: "US Dollar",
            description: "Explore American universities, career opportunities, education costs and diverse lifestyles."
        },

        "United Kingdom": {
            flag: "🇬🇧",
            capital: "London",
            region: "Europe",
            population: "69 million",
            currency: "Pound Sterling",
            description: "Discover British universities, degree programmes, scholarships and living expenses."
        },

        "France": {
            flag: "🇫🇷",
            capital: "Paris",
            region: "Europe",
            population: "68 million",
            currency: "Euro",
            description: "Explore French universities, international programmes, career opportunities and culture."
        },

        "Australia": {
            flag: "🇦🇺",
            capital: "Canberra",
            region: "Oceania",
            population: "27 million",
            currency: "Australian Dollar",
            description: "Discover Australian universities, international education, employment and lifestyle."
        },

        "Japan": {
            flag: "🇯🇵",
            capital: "Tokyo",
            region: "East Asia",
            population: "123 million",
            currency: "Japanese Yen",
            description: "Explore Japanese universities, technology, education programmes and cultural experiences."
        },

        "South Korea": {
            flag: "🇰🇷",
            capital: "Seoul",
            region: "East Asia",
            population: "52 million",
            currency: "South Korean Won",
            description: "Discover South Korean universities, technology, international education and lifestyle."
        },

        "Spain": {
            flag: "🇪🇸",
            capital: "Madrid",
            region: "Europe",
            population: "49 million",
            currency: "Euro",
            description: "Explore Spanish universities, study opportunities, regional living costs and culture."
        },

        "Poland": {
            flag: "🇵🇱",
            capital: "Warsaw",
            region: "Europe",
            population: "37 million",
            currency: "Polish Zloty",
            description: "Discover Polish universities, international degree programmes and student life."
        },

        "Netherlands": {
            flag: "🇳🇱",
            capital: "Amsterdam",
            region: "Europe",
            population: "18 million",
            currency: "Euro",
            description: "Explore Dutch universities, English-taught courses, careers and living expenses."
        },

        "New Zealand": {
            flag: "🇳🇿",
            capital: "Wellington",
            region: "Oceania",
            population: "5.3 million",
            currency: "New Zealand Dollar",
            description: "Discover New Zealand universities, education opportunities and lifestyle."
        },

        "Ireland": {
            flag: "🇮🇪",
            capital: "Dublin",
            region: "Europe",
            population: "5.4 million",
            currency: "Euro",
            description: "Explore Irish universities, technology careers, international education and living costs."
        },

        "Czechia": {
            flag: "🇨🇿",
            capital: "Prague",
            region: "Europe",
            population: "10.9 million",
            currency: "Czech Koruna",
            description: "Discover Czech universities, engineering programmes, student life and accommodation."
        }

    };


    // 3. COUNTRY PANEL ELEMENTS

    const placeholder = document.getElementById("panel-placeholder");
    const details = document.getElementById("country-details");

    const flagElement = document.getElementById("country-flag");
    const nameElement = document.getElementById("country-name");
    const descriptionElement = document.getElementById("country-description");
    const capitalElement = document.getElementById("country-capital");
    const regionElement = document.getElementById("country-region");
    const populationElement = document.getElementById("country-population");
    const currencyElement = document.getElementById("country-currency");

    const exploreButton = document.getElementById("explore-country-button");

    let selectedCountry = null;
    let selectedLayer = null;


    // 4. SELECT A COUNTRY

    function selectCountry(countryName, layer) {

        selectedCountry = countryName;

        if (selectedLayer) {
            selectedLayer.setStyle({
                color: "#9aabbc",
                weight: 1,
                fillColor: "#29465a",
                fillOpacity: 0.28
            });
        }

        selectedLayer = layer || null;

        if (selectedLayer) {
            selectedLayer.setStyle({
                color: "#8df5b5",
                weight: 2,
                fillColor: "#8df5b5",
                fillOpacity: 0.55
            });

            if (selectedLayer.bringToFront) {
                selectedLayer.bringToFront();
            }
        }

        const data = countryData[countryName];

        placeholder.hidden = true;
        details.hidden = false;

        flagElement.textContent = data ? data.flag : "🌍";
        nameElement.textContent = countryName;

        descriptionElement.textContent = data
            ? data.description
            : "Explore education, living costs, careers and lifestyle in " + countryName + ".";

        capitalElement.textContent = data ? data.capital : "Explore details";
        regionElement.textContent = data ? data.region : "Country";
        populationElement.textContent = data ? data.population : "See country profile";
        currencyElement.textContent = data ? data.currency : "See country profile";

        document.getElementById("country-panel").scrollIntoView({
            behavior: "smooth",
            block: "nearest"
        });
    }


    // 5. LOAD CLICKABLE COUNTRY BOUNDARIES
    // Country boundaries are loaded from a public GeoJSON dataset.

    const geoJsonURL =
        "https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson";

    fetch(geoJsonURL)
        .then(response => {
            if (!response.ok) {
                throw new Error("Could not load country boundaries.");
            }

            return response.json();
        })
        .then(geojson => {

            const countryLayer = L.geoJSON(geojson, {

                style: {
                    color: "#9aabbc",
                    weight: 1,
                    fillColor: "#29465a",
                    fillOpacity: 0.28
                },

                onEachFeature: function (feature, layer) {

                    const properties = feature.properties || {};

                    const countryName =
                        properties.ADMIN ||
                        properties.name ||
                        properties.NAME ||
                        properties.name_long;

                    if (!countryName) return;

                    layer.bindTooltip(countryName, {
                        sticky: true,
                        direction: "top"
                    });

                    layer.on({

                        mouseover: function () {
                            if (layer !== selectedLayer) {
                                layer.setStyle({
                                    color: "#8df5b5",
                                    weight: 2,
                                    fillOpacity: 0.5
                                });
                            }
                        },

                        mouseout: function () {
                            if (layer !== selectedLayer) {
                                countryLayer.resetStyle(layer);

                                if (layer === selectedLayer) {
                                    layer.setStyle({
                                        color: "#8df5b5",
                                        weight: 2,
                                        fillColor: "#8df5b5",
                                        fillOpacity: 0.55
                                    });
                                }
                            }
                        },

                        click: function () {
                            selectCountry(countryName, layer);
                        }

                    });
                }

            }).addTo(map);

            console.log("Global Explorer: Country boundaries loaded!");

        })
        .catch(error => {
            console.error("Country map data could not be loaded:", error);
        });


    // 6. EXPLORE COUNTRY BUTTON

    exploreButton.addEventListener("click", function () {

        if (!selectedCountry) return;

        const countrySlug = selectedCountry
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "");

        alert(
            "Welcome to " + selectedCountry + "!\n\n" +
            "The detailed country dashboard is our next development stage.\n\n" +
            "Planned sections:\n" +
            "• Study and universities\n" +
            "• Cost of living\n" +
            "• Careers and economy\n" +
            "• Visas and immigration\n" +
            "• Culture and lifestyle\n\n" +
            "Country page identifier: " + countrySlug
        );

    });


    // 7. FINISH INITIALIZATION

    setTimeout(function () {
        map.invalidateSize();
    }, 300);

} else {

    console.error(
        "Global Explorer: Map element or Leaflet library was not found."
    );

}
```
