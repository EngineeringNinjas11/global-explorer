
document.addEventListener("DOMContentLoaded", initGlobalExplorer);

function initGlobalExplorer() {
    const mapElement = document.getElementById("map");

    if (!mapElement) {
        console.error("Map element #map was not found.");
        return;
    }

    if (typeof L === "undefined") {
        console.error("Leaflet library has not loaded.");
        return;
    }

    // =========================
    // 1. INITIALIZE WORLD MAP
    // =========================

    const map = L.map("map", {
        worldCopyJump: true
    }).setView([20, 0], 2);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 18
    }).addTo(map);

    let countryLayer = null;
    let selectedLayer = null;
    let selectedCountry = null;
    let requestNumber = 0;

    const defaultStyle = {
        color: "#64748b",
        weight: 1,
        fillColor: "#94a3b8",
        fillOpacity: 0.15,
        interactive: true
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
        fillOpacity: 0.55
    };

    // =========================
    // 2. COUNTRY PANEL ELEMENTS
    // =========================

    const panelPlaceholder =
        document.getElementById("panel-placeholder");

    const countryDetails =
        document.getElementById("country-details");

    const countryFlag =
        document.getElementById("country-flag");

    const countryName =
        document.getElementById("country-name");

    const countryDescription =
        document.getElementById("country-description");

    const countryCapital =
        document.getElementById("country-capital");

    const countryRegion =
        document.getElementById("country-region");

    const countryPopulation =
        document.getElementById("country-population");

    const countryCurrency =
        document.getElementById("country-currency");

    function setText(element, value) {
        if (element) {
            element.textContent = value || "Not available";
        }
    }

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

    function getCountryCode(feature) {
        const properties = feature.properties || {};

        const codes = [
            properties.ISO_A3,
            properties.ISO_A3_EH,
            properties.ADM0_A3,
            properties.iso_a3
        ];

        for (const code of codes) {
            if (
                typeof code === "string" &&
                /^[A-Z]{3}$/i.test(code) &&
                code !== "-99"
            ) {
                return code.toLowerCase();
            }
        }

        return "";
    }

    // =========================
    // 3. DISPLAY COUNTRY PANEL
    // =========================

    function showCountryPanel(feature) {
        const name = getCountryName(feature);

        if (panelPlaceholder) {
            panelPlaceholder.style.display = "none";
        }

        if (countryDetails) {
            countryDetails.style.display = "block";
        }

        setText(countryName, name);
        setText(
            countryDescription,
            `Discover education, living costs, careers and opportunities in ${name}.`
        );

        setText(countryCapital, "Loading...");
        setText(countryRegion, "Loading...");
        setText(countryPopulation, "Loading...");
        setText(countryCurrency, "Loading...");

        if (countryFlag) {
            countryFlag.replaceChildren();
            countryFlag.textContent = "🌍";
        }
    }

    // =========================
    // 4. FETCH COUNTRY DATA
    // =========================

    async function fetchCountryData(feature) {
        const name = getCountryName(feature);
        const code = getCountryCode(feature);

        const fields =
            "name,capital,region,subregion,population,currencies,flags";

        const urls = [];

        if (code) {
            urls.push(
                `https://restcountries.com/v3.1/alpha/${encodeURIComponent(code)}?fields=${fields}`
            );
        }

        urls.push(
            `https://restcountries.com/v3.1/name/${encodeURIComponent(name)}?fields=${fields}`
        );

        for (const url of urls) {
            try {
                const response = await fetch(url);

                if (!response.ok) {
                    continue;
                }

                const data = await response.json();
                const country = Array.isArray(data) ? data[0] : data;

                if (country && country.name) {
                    return country;
                }
            } catch (error) {
                console.warn("Country API request failed:", error);
            }
        }

        throw new Error(`Country information unavailable for ${name}`);
    }

    // =========================
    // 5. LOAD COUNTRY DETAILS
    // =========================

    async function loadCountryDetails(feature) {
        const currentRequest = ++requestNumber;
        const fallbackName = getCountryName(feature);

        showCountryPanel(feature);

        try {
            const country = await fetchCountryData(feature);

            if (currentRequest !== requestNumber) {
                return;
            }

            const name = country.name?.common || fallbackName;

            const capital = Array.isArray(country.capital)
                ? country.capital.join(", ")
                : "Not available";

            const region = [
                country.region,
                country.subregion
            ].filter(Boolean).join(" — ") || "Not available";

            let currency = "Not available";

            if (country.currencies) {
                currency = Object.entries(country.currencies)
                    .map(([code, details]) => {
                        const currencyName = details.name || code;
                        const symbol = details.symbol
                            ? ` (${details.symbol})`
                            : "";

                        return `${currencyName}${symbol}`;
                    })
                    .join(", ");
            }

            setText(countryName, name);
            setText(countryCapital, capital);
            setText(countryRegion, region);

            setText(
                countryPopulation,
                typeof country.population === "number"
                    ? country.population.toLocaleString("en-US")
                    : "Not available"
            );

            setText(countryCurrency, currency);

            setText(
                countryDescription,
                `Explore education, living costs, careers and opportunities in ${name}.`
            );

            if (countryFlag) {
                countryFlag.replaceChildren();

                const flagURL =
                    country.flags?.svg || country.flags?.png;

                if (flagURL) {
                    const image = document.createElement("img");

                    image.src = flagURL;
                    image.alt = `${name} flag`;
                    image.style.width = "48px";
                    image.style.height = "32px";
                    image.style.objectFit = "contain";

                    countryFlag.appendChild(image);
                } else {
                    countryFlag.textContent = "🌍";
                }
            }
        } catch (error) {
            if (currentRequest !== requestNumber) {
                return;
            }

            console.error("Could not load country details:", error);

            setText(countryCapital, "Unavailable");
            setText(countryRegion, "Unavailable");
            setText(countryPopulation, "Unavailable");
            setText(countryCurrency, "Unavailable");

            setText(
                countryDescription,
                `We couldn't load information for ${fallbackName}. Please check your internet connection and try again.`
            );
        }
    }

    // =========================
    // 6. COUNTRY CLICK HANDLER
    // =========================

    function selectCountry(feature, layer) {
        console.log("Country clicked:", getCountryName(feature));

        if (selectedLayer && countryLayer) {
            countryLayer.resetStyle(selectedLayer);
        }

        selectedLayer = layer;
        selectedCountry = feature;

        layer.setStyle(selectedStyle);

        if (typeof layer.bringToFront === "function") {
            layer.bringToFront();
        }

        loadCountryDetails(feature);

        // Zoom in without losing the selected country.
        try {
            map.fitBounds(layer.getBounds(), {
                padding: [25, 25],
                maxZoom: 5
            });
        } catch (error) {
            console.warn("Could not zoom to country:", error);
        }
    }

    function onEachCountry(feature, layer) {
        const name = getCountryName(feature);

        layer.bindTooltip(name, {
            sticky: true
        });

        layer.on("mouseover", function () {
            if (layer !== selectedLayer) {
                layer.setStyle(hoverStyle);
            }
        });

        layer.on("mouseout", function () {
            if (layer !== selectedLayer && countryLayer) {
                countryLayer.resetStyle(layer);
            }
        });

        layer.on("click", function () {
            selectCountry(feature, layer);
        });
    }

    // =========================
    // 7. LOAD COUNTRY BOUNDARIES
    // =========================

    fetch(
        "https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson"
    )
        .then(response => {
            if (!response.ok) {
                throw new Error("Failed to load world country boundaries.");
            }

            return response.json();
        })
        .then(data => {
            countryLayer = L.geoJSON(data, {
                style: defaultStyle,
                onEachFeature: onEachCountry,
                interactive: true
            }).addTo(map);

            // Explicitly allow mouse interaction with country shapes.
            countryLayer.eachLayer(layer => {
                if (layer.getElement) {
                    const element = layer.getElement();

                    if (element) {
                        element.style.pointerEvents = "auto";
                        element.style.cursor = "pointer";
                    }
                }
            });

            map.fitBounds(countryLayer.getBounds());

            setTimeout(() => {
                map.invalidateSize();

                // Reapply interaction styles after map rendering.
                if (countryLayer) {
                    countryLayer.eachLayer(layer => {
                        if (layer.getElement) {
                            const element = layer.getElement();

                            if (element) {
                                element.style.pointerEvents = "auto";
                                element.style.cursor = "pointer";
                            }
                        }
                    });
                }
            }, 300);

            console.log("Global Explorer map loaded successfully.");
        })
        .catch(error => {
            console.error("World map loading failed:", error);

            const message = document.createElement("p");

            message.textContent =
                "The map could not load. Please refresh the page and check your internet connection.";

            message.style.padding = "20px";
            mapElement.appendChild(message);
        });

    // =========================
    // 8. RESET MAP BUTTON
    // =========================

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

            console.log("Map selection reset.");
        });
    }

    // =========================
    // 9. EXPLORE COUNTRY BUTTON
    // =========================

    const exploreButton =
        document.getElementById("explore-country-button");

    if (exploreButton) {
        exploreButton.addEventListener("click", () => {
            if (selectedCountry) {
                loadCountryDetails(selectedCountry);
            } else {
                alert("First, click a country on the world map!");
            }
        });
    }

    // =========================
    // 10. MAP RESIZE
    // =========================

    window.addEventListener("resize", () => {
        map.invalidateSize();
    });
}
```
