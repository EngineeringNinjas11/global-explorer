document.addEventListener("DOMContentLoaded", () => {
    initGlobalExplorer();
});

function initGlobalExplorer() {
    const mapElement = document.getElementById("map");

    if (!mapElement) {
        console.error('Map element "#map" was not found.');
        return;
    }

    // MAP SETUP
    const map = L.map("map", {
        worldCopyJump: true
    }).setView([20, 0], 2);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 18
    }).addTo(map);

    let countryLayer;
    let selectedLayer = null;
    let selectedCountry = null;
    let requestNumber = 0;

    const countryStyle = {
        color: "#64748b",
        weight: 1,
        fillColor: "#94a3b8",
        fillOpacity: 0.15
    };

    const hoverStyle = {
        color: "#2563eb",
        weight: 2,
        fillColor: "#60a5fa",
        fillOpacity: 0.4
    };

    const selectedStyle = {
        color: "#1d4ed8",
        weight: 2,
        fillColor: "#3b82f6",
        fillOpacity: 0.5
    };

    // HTML ELEMENTS
    const panelPlaceholder = document.getElementById("panel-placeholder");
    const countryDetails = document.getElementById("country-details");

    const countryFlag = document.getElementById("country-flag");
    const countryName = document.getElementById("country-name");
    const countryDescription = document.getElementById("country-description");

    const countryCapital = document.getElementById("country-capital");
    const countryRegion = document.getElementById("country-region");
    const countryPopulation = document.getElementById("country-population");
    const countryCurrency = document.getElementById("country-currency");

    // GET COUNTRY NAME FROM MAP DATA
    function getCountryName(feature) {
        const properties = feature.properties || {};

        return (
            properties.ADMIN ||
            properties.name ||
            properties.NAME ||
            properties.NAME_EN ||
            properties.admin ||
            "Unknown country"
        );
    }

    // GET COUNTRY CODE FROM MAP DATA
    function getCountryCode(feature) {
        const properties = feature.properties || {};

        const possibleCodes = [
            properties.ISO_A3,
            properties.ADM0_A3,
            properties.SOV_A3,
            properties.ISO_A3_EH,
            properties.iso_a3
        ];

        for (const value of possibleCodes) {
            if (
                typeof value === "string" &&
                /^[A-Z]{3}$/i.test(value) &&
                value !== "-99"
            ) {
                return value.toLowerCase();
            }
        }

        return "";
    }

    // UPDATE A FIELD SAFELY
    function setText(element, value) {
        if (element) {
            element.textContent = value || "Not available";
        }
    }

    // FORMAT POPULATION
    function formatPopulation(population) {
        if (typeof population !== "number") {
            return "Not available";
        }

        return population.toLocaleString("en-US");
    }

    // SHOW COUNTRY PANEL
    function showCountryPanel(feature) {
        const name = getCountryName(feature);

        if (panelPlaceholder) {
            panelPlaceholder.style.display = "none";
        }

        if (countryDetails) {
            countryDetails.style.display = "block";
        }

        setText(countryName, name);
        setText(countryDescription, `Explore information about ${name}.`);

        setText(countryCapital, "Loading...");
        setText(countryRegion, "Loading...");
        setText(countryPopulation, "Loading...");
        setText(countryCurrency, "Loading...");

        if (countryFlag) {
            countryFlag.replaceChildren();
            countryFlag.textContent = "🌍";
        }
    }

    // FETCH COUNTRY DATA
    async function fetchCountryData(feature) {
        const name = getCountryName(feature);
        const code = getCountryCode(feature);

        // First try the country code, then fall back to the country name.
        const endpoints = [];

        if (code) {
            endpoints.push(
                `https://restcountries.com/v3.1/alpha/${encodeURIComponent(code)}?fields=name,capital,region,subregion,population,currencies,flags,cca3`
            );
        }

        endpoints.push(
            `https://restcountries.com/v3.1/name/${encodeURIComponent(name)}?fields=name,capital,region,subregion,population,currencies,flags,cca3`
        );

        for (const endpoint of endpoints) {
            try {
                const response = await fetch(endpoint);

                if (!response.ok) {
                    continue;
                }

                const result = await response.json();

                const country = Array.isArray(result)
                    ? result[0]
                    : result;

                if (
                    country &&
                    typeof country === "object" &&
                    country.name
                ) {
                    return country;
                }
            } catch (error) {
                console.warn("Country data request failed:", endpoint, error);
            }
        }

        throw new Error(`Could not retrieve information for ${name}.`);
    }

    // LOAD COUNTRY DETAILS
    async function loadCountryDetails(feature) {
        const thisRequest = ++requestNumber;
        const name = getCountryName(feature);

        showCountryPanel(feature);

        try {
            const country = await fetchCountryData(feature);

            // Prevent old requests from replacing the latest selection.
            if (thisRequest !== requestNumber) {
                return;
            }

            const capital = Array.isArray(country.capital)
                ? country.capital.join(", ")
                : "Not available";

            const region = [
                country.region,
                country.subregion
            ].filter(Boolean).join(" — ") || "Not available";

            let currency = "Not available";

            if (country.currencies) {
                const currencies = Object.entries(country.currencies);

                if (currencies.length > 0) {
                    currency = currencies
                        .map(([code, details]) => {
                            const currencyName = details?.name || code;
                            const symbol = details?.symbol
                                ? ` (${details.symbol})`
                                : "";

                            return `${currencyName}${symbol}`;
                        })
                        .join(", ");
                }
            }

            setText(countryName, country.name?.common || name);
            setText(countryCapital, capital);
            setText(countryRegion, region);
            setText(countryPopulation, formatPopulation(country.population));
            setText(countryCurrency, currency);

            if (countryDescription) {
                setText(
                    countryDescription,
                    `Discover education, living costs, careers and opportunities in ${
                        country.name?.common || name
                    }.`
                );
            }

            if (countryFlag) {
                countryFlag.replaceChildren();

                if (country.flags?.svg || country.flags?.png) {
                    const image = document.createElement("img");

                    image.src = country.flags.svg || country.flags.png;
                    image.alt = `${country.name?.common || name} flag`;
                    image.style.width = "48px";
                    image.style.height = "32px";
                    image.style.objectFit = "contain";

                    countryFlag.appendChild(image);
                } else {
                    countryFlag.textContent = "🌍";
                }
            }

        } catch (error) {
            if (thisRequest !== requestNumber) {
                return;
            }

            console.error("Unable to load country details:", error);

            setText(countryCapital, "Could not load");
            setText(countryRegion, "Could not load");
            setText(countryPopulation, "Could not load");
            setText(countryCurrency, "Could not load");

            if (countryDescription) {
                setText(
                    countryDescription,
                    `We couldn't load information for ${name}. Please check your internet connection and try again.`
                );
            }
        }
    }

    // COUNTRY CLICK AND HOVER
    function onEachCountry(feature, layer) {
        const name = getCountryName(feature);

        layer.bindTooltip(name, {
            sticky: true
        });

        layer.on({
            mouseover: function (event) {
                const target = event.target;

                if (target !== selectedLayer) {
                    target.setStyle(hoverStyle);
                }

                if (typeof target.bringToFront === "function") {
                    target.bringToFront();
                }
            },

            mouseout: function (event) {
                const target = event.target;

                if (target !== selectedLayer && countryLayer) {
                    countryLayer.resetStyle(target);
                }
            },

            click: function (event) {
                if (selectedLayer && countryLayer) {
                    countryLayer.resetStyle(selectedLayer);
                }

                selectedLayer = event.target;
                selectedCountry = feature;

                selectedLayer.setStyle(selectedStyle);

                if (typeof selectedLayer.bringToFront === "function") {
                    selectedLayer.bringToFront();
                }

                map.fitBounds(selectedLayer.getBounds(), {
                    padding: [30, 30],
                    maxZoom: 5
                });

                loadCountryDetails(feature);
            }
        });
    }

    // LOAD WORLD COUNTRY BOUNDARIES
    fetch(
        "https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson"
    )
        .then(response => {
            if (!response.ok) {
                throw new Error("Could not load the world map data.");
            }

            return response.json();
        })
        .then(data => {
            countryLayer = L.geoJSON(data, {
                style: countryStyle,
                onEachFeature: onEachCountry
            }).addTo(map);

            map.fitBounds(countryLayer.getBounds());

            setTimeout(() => {
                map.invalidateSize();
            }, 200);
        })
        .catch(error => {
            console.error("Map loading error:", error);

            if (mapElement) {
                const message = document.createElement("p");

                message.textContent =
                    "The map could not load. Please check your internet connection and refresh the page.";

                message.style.padding = "20px";
                mapElement.appendChild(message);
            }
        });

    // RESET MAP BUTTON
    const resetButton = document.getElementById("reset-map");

    if (resetButton) {
        resetButton.addEventListener("click", () => {
            if (selectedLayer && countryLayer) {
                countryLayer.resetStyle(selectedLayer);
            }

            selectedLayer = null;
            selectedCountry = null;
            requestNumber++;

            map.setView([20, 0], 2);

            if (panelPlaceholder) {
                panelPlaceholder.style.display = "";
            }

            if (countryDetails) {
                countryDetails.style.display = "none";
            }
        });
    }

    // EXPLORE COUNTRY BUTTON
    const exploreButton = document.getElementById("explore-country-button");

    if (exploreButton) {
        exploreButton.addEventListener("click", () => {
            if (selectedCountry) {
                loadCountryDetails(selectedCountry);
            } else {
                alert("Bro, first click on a country on the map!");
            }
        });
    }

    // INITIAL MAP RESIZE
    window.addEventListener("resize", () => {
        map.invalidateSize();
    });
}
