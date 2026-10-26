document.addEventListener("DOMContentLoaded", initGlobalExplorer);

function initGlobalExplorer() {
    const mapElement = document.getElementById("map");

    if (!mapElement || typeof L === "undefined") {
        console.error("Map element or Leaflet library is missing.");
        return;
    }

    // 1. Initialize map
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
    let countryDatabase = null;

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

    // 2. Country information panel
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

        for (const code of [
            p.ISO_A3,
            p.ISO_A3_EH,
            p.ADM0_A3,
            p.iso_a3
        ]) {
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

    // 3. Load a static country database from GitHub
    async function loadCountryDatabase() {
        if (countryDatabase) {
            return countryDatabase;
        }

        const url =
            "https://raw.githubusercontent.com/mledoze/countries/master/countries.json";

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error("Could not download the country database.");
        }

        countryDatabase = await response.json();

        return countryDatabase;
    }

    // 4. Find a country in the database
    async function fetchCountryData(feature) {
        const name = getCountryName(feature);
        const code = getCountryCode(feature);

        const database = await loadCountryDatabase();

        let country = null;

        // Match using the ISO three-letter country code.
        if (code) {
            country = database.find(
                item => item.cca3 === code
            );
        }

        // Fallback: match country names.
        if (!country) {
            const normalizedName = name
                .toLowerCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .trim();

            const aliases = {
                "united states of america": "united states",
                "russian federation": "russia",
                "south korea": "korea, republic of",
                "north korea": "korea, democratic people's republic of",
                "ivory coast": "cote d'ivoire",
                "czechia": "czech republic",
                "republic of the congo": "congo",
                "democratic republic of the congo":
                    "congo, the democratic republic of the",
                "united republic of tanzania": "tanzania",
                "swaziland": "eswatini",
                "cape verde": "cabo verde",
                "the bahamas": "bahamas",
                "the gambia": "gambia"
            };

            const searchName = aliases[normalizedName] || normalizedName;

            country = database.find(item => {
                const commonName = (item.name?.common || "")
                    .toLowerCase()
                    .normalize("NFD")
                    .replace(/[\u0300-\u036f]/g, "")
                    .trim();

                const officialName = (item.name?.official || "")
                    .toLowerCase()
                    .normalize("NFD")
                    .replace(/[\u0300-\u036f]/g, "")
                    .trim();

                return (
                    commonName === searchName ||
                    officialName === searchName
                );
            });
        }

        if (!country) {
            throw new Error(`Country not found: ${name}`);
        }

        const currencies = country.currencies || {};

        const currencyText = Object.entries(currencies)
            .map(([code, details]) => {
                const currencyName = details.name || code;
                const symbol = details.symbol
                    ? ` (${details.symbol})`
                    : "";

                return `${currencyName}${symbol}`;
            })
            .join(", ");

        return {
            name: country.name?.common || name,
            officialName: country.name?.official || name,
            capital: (country.capital || []).join(", "),
            region: [
                country.region,
                country.subregion
            ].filter(Boolean).join(" — "),
            population: country.population,
            currencies: currencyText,
            flag: country.flags?.svg || country.flags?.png || "",
            cca2: country.cca2 || ""
        };
    }

    // 5. Display country information
    function showCountryPanel(feature) {
        const name = getCountryName(feature);

        if (panelPlaceholder) {
            panelPlaceholder.style.display = "none";
        }

        if (countryDetails) {
    countryDetails.hidden = false;
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

    async function loadCountryDetails(feature) {
        const currentRequest = ++requestNumber;

        showCountryPanel(feature);

        try {
            const country = await fetchCountryData(feature);

            // Prevent older requests overwriting the latest selection.
            if (currentRequest !== requestNumber) {
                return;
            }

            setText(countryName, country.name);
            setText(countryCapital, country.capital);
            setText(countryRegion, country.region);

            setText(
                countryPopulation,
                typeof country.population === "number"
                    ? country.population.toLocaleString("en-US")
                    : "Not available"
            );

            setText(countryCurrency, country.currencies);

            setText(
                countryDescription,
                `Explore education, living costs, careers and opportunities in ${country.name}.`
            );

            if (countryFlag) {
                countryFlag.replaceChildren();

                if (country.flag) {
                    const img = document.createElement("img");

                    img.src = country.flag;
                    img.alt = `${country.name} flag`;
                    img.style.width = "48px";
                    img.style.height = "32px";
                    img.style.objectFit = "contain";

                    countryFlag.appendChild(img);
                } else {
                    countryFlag.textContent = "🌍";
                }
            }

            console.log("Country information loaded:", country.name);

        } catch (error) {
            if (currentRequest !== requestNumber) {
                return;
            }

            console.error("Country information error:", error);

            setText(countryCapital, "Unavailable");
            setText(countryRegion, "Unavailable");
            setText(countryPopulation, "Unavailable");
            setText(countryCurrency, "Unavailable");

            setText(
                countryDescription,
                "Country information could not be loaded. Please check your internet connection and try again."
            );
        }
    }

    // 6. Country selection
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
        layer.bindTooltip(getCountryName(feature), {
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

    // 7. Load country boundaries
    fetch(
        "https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson"
    )
        .then(response => {
            if (!response.ok) {
                throw new Error("Could not load the world map.");
            }

            return response.json();
        })
        .then(data => {
            countryLayer = L.geoJSON(data, {
                style: defaultStyle,
                onEachFeature: onEachCountry,
                interactive: true
            }).addTo(map);

            map.fitBounds(countryLayer.getBounds());

            setTimeout(() => map.invalidateSize(), 300);

            console.log("Global Explorer map loaded.");
        })
        .catch(error => {
            console.error("Map loading error:", error);

            const message = document.createElement("p");
            message.textContent =
                "The map could not load. Please refresh the page.";

            message.style.padding = "20px";
            mapElement.appendChild(message);
        });

    // 8. Reset button
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

            console.log("Map reset.");
        });
    }

    // 9. Explore button
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

    // 10. Resize
    window.addEventListener("resize", () => {
        map.invalidateSize();
    });
}
