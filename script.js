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

    // 1. INITIALIZE MAP
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
        fillOpacity: 0.55
    };

    // 2. COUNTRY PANEL
    const panelPlaceholder = document.getElementById("panel-placeholder");
    const countryDetails = document.getElementById("country-details");
    const countryFlag = document.getElementById("country-flag");
    const countryName = document.getElementById("country-name");
    const countryDescription = document.getElementById("country-description");
    const countryCapital = document.getElementById("country-capital");
    const countryRegion = document.getElementById("country-region");
    const countryPopulation = document.getElementById("country-population");
    const countryCurrency = document.getElementById("country-currency");

    function setText(element, value) {
        if (element) {
            element.textContent = value || "Not available";
        }
    }

    function getCountryName(feature) {
        const p = feature.properties || {};

        return (
            p.ADMIN ||
            p.name ||
            p.NAME ||
            p.NAME_EN ||
            p.admin ||
            "Unknown country"
        );
    }

    function getCountryCode(feature) {
        const p = feature.properties || {};

        const codes = [
            p.ISO_A3,
            p.ISO_A3_EH,
            p.ADM0_A3,
            p.iso_a3
        ];

        for (const code of codes) {
            if (
                typeof code === "string" &&
                /^[A-Z]{3}$/i.test(code) &&
                code !== "-99"
            ) {
                return code.toUpperCase();
            }
        }

        return "";
    }

    function getISO2(feature) {
        const p = feature.properties || {};

        const possibleCodes = [
            p.ISO_A2,
            p.ISO_A2_EH,
            p.iso_a2
        ];

        for (const code of possibleCodes) {
            if (
                typeof code === "string" &&
                /^[A-Z]{2}$/i.test(code) &&
                code !== "-99"
            ) {
                return code.toLowerCase();
            }
        }

        return "";
    }

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

    // 3. LOAD COUNTRY INFORMATION
    async function fetchCountryData(feature) {
        const name = getCountryName(feature);
        const code = getCountryCode(feature);

        let worldBankCountry = null;
        let population = null;
        let extraInfo = null;

        // World Bank: capital, region and country metadata
        if (code) {
            try {
                const response = await fetch(
                    `https://api.worldbank.org/v2/country/${encodeURIComponent(code)}?format=json`
                );

                if (response.ok) {
                    const data = await response.json();

                    if (
                        Array.isArray(data) &&
                        Array.isArray(data[1]) &&
                        data[1][0]
                    ) {
                        worldBankCountry = data[1][0];
                    }
                }
            } catch (error) {
                console.warn("World Bank country request failed:", error);
            }

            // World Bank: population data
            try {
                const response = await fetch(
                    `https://api.worldbank.org/v2/country/${encodeURIComponent(code)}/indicator/SP.POP.TOTL?format=json&per_page=100`
                );

                if (response.ok) {
                    const data = await response.json();

                    if (Array.isArray(data) && Array.isArray(data[1])) {
                        const latest = data[1].find(
                            item => item.value !== null
                        );

                        if (latest) {
                            population = latest.value;
                        }
                    }
                }
            } catch (error) {
                console.warn("Population request failed:", error);
            }
        }

        // CountriesNow: capital, currency and flag
        try {
            const response = await fetch(
                "https://countriesnow.space/api/v0.1/countries/info?returns=capital,currency,flag,iso2,iso3",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        country: name
                    })
                }
            );

            if (response.ok) {
                const result = await response.json();

                if (
                    result &&
                    result.data &&
                    !result.error
                ) {
                    extraInfo = result.data;
                }
            }
        } catch (error) {
            console.warn("Additional country data request failed:", error);
        }

        if (!worldBankCountry && !extraInfo) {
            throw new Error(`Country information unavailable for ${name}`);
        }

        return {
            name: worldBankCountry?.name || name,

            capital:
                worldBankCountry?.capitalCity ||
                extraInfo?.capital ||
                "Not available",

            region:
                worldBankCountry?.region?.value ||
                "Not available",

            subregion:
                worldBankCountry?.adminregion?.value || "",

            population: population,

            currency:
                extraInfo?.currency ||
                "Not available",

            iso2:
                worldBankCountry?.iso2Code?.toLowerCase() ||
                extraInfo?.iso2?.toLowerCase() ||
                getISO2(feature),

            flag:
                extraInfo?.flag || ""
        };
    }

    // 4. DISPLAY COUNTRY INFORMATION
    async function loadCountryDetails(feature) {
        const currentRequest = ++requestNumber;
        const fallbackName = getCountryName(feature);

        showCountryPanel(feature);

        try {
            const country = await fetchCountryData(feature);

            // Ignore old requests if another country was clicked
            if (currentRequest !== requestNumber) {
                return;
            }

            setText(countryName, country.name);
            setText(countryCapital, country.capital);

            const regionText = [
                country.region,
                country.subregion
            ].filter(Boolean).join(" — ");

            setText(countryRegion, regionText);

            setText(
                countryPopulation,
                typeof country.population === "number"
                    ? country.population.toLocaleString("en-US")
                    : "Not available"
            );

            setText(countryCurrency, country.currency);

            setText(
                countryDescription,
                `Explore education, living costs, careers and opportunities in ${country.name}.`
            );

            if (countryFlag) {
                countryFlag.replaceChildren();

                const flagURL = country.flag ||
                    (country.iso2
                        ? `https://flagcdn.com/${country.iso2}.svg`
                        : "");

                if (flagURL) {
                    const image = document.createElement("img");

                    image.src = flagURL;
                    image.alt = `${country.name} flag`;
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
                `We couldn't load information for ${fallbackName}. Please try again later.`
            );
        }
    }

    // 5. COUNTRY SELECTION
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

    // 6. LOAD WORLD MAP
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

            countryLayer.eachLayer(layer => {
                if (layer.getElement()) {
                    layer.getElement().style.pointerEvents = "auto";
                    layer.getElement().style.cursor = "pointer";
                }
            });

            map.fitBounds(countryLayer.getBounds());

            setTimeout(() => {
                map.invalidateSize();
            }, 300);

            console.log("Global Explorer map loaded successfully.");
        })
        .catch(error => {
            console.error("World map loading failed:", error);

            const message = document.createElement("p");

            message.textContent =
                "The map could not load. Please refresh and check your internet connection.";

            message.style.padding = "20px";
            mapElement.appendChild(message);
        });

    // 7. RESET MAP BUTTON
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

    // 8. EXPLORE COUNTRY BUTTON
    const exploreButton = document.getElementById(
        "explore-country-button"
    );

    if (exploreButton) {
        exploreButton.addEventListener("click", () => {
            if (selectedCountry) {
                loadCountryDetails(selectedCountry);
            } else {
                alert("First, click a country on the world map!");
            }
        });
    }

    // 9. MAP RESIZE
    window.addEventListener("resize", () => {
        map.invalidateSize();
    });
}
