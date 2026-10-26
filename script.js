
/* ==========================================
   GLOBAL EXPLORER — INTERACTIVE WORLD MAP
   ========================================== */

document.addEventListener("DOMContentLoaded", initGlobalExplorer);

async function initGlobalExplorer() {
    const mapElement = document.getElementById("map");

    if (!mapElement) {
        console.error("Map container #map was not found.");
        return;
    }

    if (typeof L === "undefined") {
        showMapError("The map library could not load. Please refresh the page.");
        return;
    }

    // Create the interactive world map.
    const map = L.map("map", {
        center: [20, 0],
        zoom: 2,
        minZoom: 2,
        maxZoom: 8,
        worldCopyJump: true
    });

    // OpenStreetMap base layer.
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        noWrap: true,
        maxZoom: 19
    }).addTo(map);

    let countryLayer;
    let selectedLayer = null;
    let selectedCountry = null;

    const defaultStyle = {
        color: "#647d8c",
        weight: 0.7,
        opacity: 0.9,
        fillColor: "#244b50",
        fillOpacity: 0.48
    };

    const hoverStyle = {
        color: "#8df5b5",
        weight: 1.8,
        fillColor: "#5ccf99",
        fillOpacity: 0.78
    };

    const selectedStyle = {
        color: "#b3ffd0",
        weight: 2,
        fillColor: "#45c98c",
        fillOpacity: 0.85
    };

    // Country information panel elements.
    const placeholder = document.getElementById("panel-placeholder");
    const details = document.getElementById("country-details");

    const fields = {
        flag: document.getElementById("country-flag"),
        name: document.getElementById("country-name"),
        description: document.getElementById("country-description"),
        capital: document.getElementById("country-capital"),
        region: document.getElementById("country-region"),
        population: document.getElementById("country-population"),
        currency: document.getElementById("country-currency")
    };

    function showMapError(message) {
        mapElement.innerHTML = "";

        const error = document.createElement("div");
        error.style.cssText =
            "padding:24px;color:#edf4f5;font:14px sans-serif;line-height:1.8";
        error.textContent = message;

        mapElement.appendChild(error);
    }

    function getCountryName(feature) {
        const properties = feature.properties || {};

        return (
            properties.ADMIN ||
            properties.name ||
            properties.NAME ||
            properties.NAME_EN ||
            "Unknown country"
        );
    }

    function getCountryCode(feature) {
        const properties = feature.properties || {};

        const code =
            properties.ISO_A3 ||
            properties.ADM0_A3 ||
            properties.SOV_A3 ||
            "";

        return code === "-99" ? "" : code;
    }

    function formatPopulation(value) {
        if (value === null || value === undefined || value === "") {
            return "Unavailable";
        }

        const number = Number(value);

        return Number.isFinite(number)
            ? new Intl.NumberFormat("en-US", {
                notation: "compact",
                maximumFractionDigits: 1
            }).format(number)
            : "Unavailable";
    }

    function setField(element, value) {
        if (element) {
            element.textContent = value || "Unavailable";
        }
    }

    function showCountryPanel(country) {
        if (placeholder) placeholder.hidden = true;
        if (details) details.hidden = false;

        setField(fields.flag, country.flag || "🌍");
        setField(fields.name, country.name);
        setField(fields.description, country.description);
        setField(fields.capital, country.capital);
        setField(fields.region, country.region);
        setField(fields.population, country.population);
        setField(fields.currency, country.currency);

        selectedCountry = country;
    }

    async function loadCountryDetails(feature) {
        const name = getCountryName(feature);
        const code = getCountryCode(feature);

        const country = {
            name: name,
            flag: "🌍",
            capital: "Loading...",
            region: "Loading...",
            population: "Loading...",
            currency: "Loading...",
            description:
                "Explore education, living costs, career opportunities and lifestyle in " +
                name + "."
        };

        showCountryPanel(country);

        // Get country facts from the REST Countries public API.
        try {
            let url = "";

            if (code && /^[A-Z]{3}$/.test(code)) {
                url =
                    "https://restcountries.com/v3.1/alpha/" +
                    encodeURIComponent(code) +
                    "?fields=name,capital,region,subregion,population,currencies,flags,cca2";
            } else {
                url =
                    "https://restcountries.com/v3.1/name/" +
                    encodeURIComponent(name) +
                    "?fullText=true&fields=name,capital,region,subregion,population,currencies,flags,cca2";
            }

            const response = await fetch(url);

            if (!response.ok) {
                throw new Error("Country information unavailable.");
            }

            const result = await response.json();
            const data = Array.isArray(result) ? result[0] : result;

            if (!data) {
                throw new Error("No country data returned.");
            }

            const currencyNames = Object.values(data.currencies || {})
                .map(currency => {
                    if (!currency) return "";
                    return currency.name
                        ? `${currency.name} (${currency.symbol || ""})`
                        : "";
                })
                .filter(Boolean);

            const capital = Array.isArray(data.capital)
                ? data.capital.join(", ")
                : "";

            const region = [data.region, data.subregion]
                .filter(Boolean)
                .join(" · ");

            const flag = data.flags?.svg
                ? `<img src="${data.flags.svg}" alt="" style="width:42px;height:30px;object-fit:contain">`
                : "";

            if (flag && fields.flag) {
                fields.flag.textContent = "";
                const image = document.createElement("img");
                image.src = data.flags.svg;
                image.alt = `${name} flag`;
                image.style.cssText =
                    "width:42px;height:30px;object-fit:contain";
                fields.flag.appendChild(image);
            }

            setField(fields.capital, capital || "Unavailable");
            setField(fields.region, region || "Unavailable");
            setField(fields.population, formatPopulation(data.population));
            setField(
                fields.currency,
                currencyNames.join(", ") || "Unavailable"
            );

            if (selectedCountry && selectedCountry.name === name) {
                selectedCountry = {
                    ...country,
                    flag: flag || "🌍",
                    capital: capital || "Unavailable",
                    region: region || "Unavailable",
                    population: formatPopulation(data.population),
                    currency: currencyNames.join(", ") || "Unavailable"
                };
            }
        } catch (error) {
            console.warn("Could not load country details:", error);

            setField(fields.capital, "Unavailable");
            setField(fields.region, "Unavailable");
            setField(fields.population, "Unavailable");
            setField(fields.currency, "Unavailable");
        }
    }

    function selectCountry(feature, layer) {
        if (selectedLayer && countryLayer) {
            countryLayer.resetStyle(selectedLayer);
        }

        selectedLayer = layer;
        layer.setStyle(selectedStyle);

        if (layer.bringToFront) {
            layer.bringToFront();
        }

        loadCountryDetails(feature);
    }

    function attachCountryEvents(feature, layer) {
        const name = getCountryName(feature);

        layer.bindTooltip(name, {
            sticky: true,
            direction: "top"
        });

        layer.on({
            mouseover: function () {
                if (layer !== selectedLayer) {
                    layer.setStyle(hoverStyle);
                }
            },

            mouseout: function () {
                if (layer !== selectedLayer && countryLayer) {
                    countryLayer.resetStyle(layer);
                }
            },

            click: function () {
                selectCountry(feature, layer);
            }
        });
    }

    // Load geographic boundaries for countries around the world.
    try {
        const geoResponse = await fetch(
            "https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson"
        );

        if (!geoResponse.ok) {
            throw new Error("World country boundaries could not be loaded.");
        }

        const geoData = await geoResponse.json();

        countryLayer = L.geoJSON(geoData, {
            style: defaultStyle,
            onEachFeature: attachCountryEvents
        }).addTo(map);

        // Fit the map to a world view.
        map.fitBounds(countryLayer.getBounds(), {
            padding: [10, 10]
        });

        // Ensure Leaflet uses the correct dimensions.
        setTimeout(() => map.invalidateSize(), 200);

    } catch (error) {
        console.error("Map loading failed:", error);

        showMapError(
            "The world map could not load. Check your internet connection and refresh the page."
        );

        return;
    }

    // Reset button.
    const resetButton = document.getElementById("reset-map");

    if (resetButton) {
        resetButton.addEventListener("click", () => {
            map.fitBounds(countryLayer.getBounds(), {
                padding: [10, 10]
            });

            if (selectedLayer) {
                countryLayer.resetStyle(selectedLayer);
                selectedLayer = null;
            }

            selectedCountry = null;

            if (placeholder) placeholder.hidden = false;
            if (details) details.hidden = true;
        });
    }

    // Allow the main Explore button to focus the map.
    const exploreButton = document.getElementById("explore-country-button");

    if (exploreButton) {
        exploreButton.addEventListener("click", () => {
            const mapArea = document.getElementById("map");

            if (mapArea) {
                mapArea.scrollIntoView({
                    behavior: "smooth",
                    block: "center"
                });

                map.invalidateSize();
            }
        });
    }

    // Allow the sidebar to return the user to the map.
    const worldButton = document.querySelector(".tool-button");

    if (worldButton) {
        worldButton.addEventListener("click", () => {
            map.fitBounds(countryLayer.getBounds(), {
                padding: [10, 10]
            });
        });
    }
}

