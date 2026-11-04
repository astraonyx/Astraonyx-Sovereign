const axios = require('axios');

const DEFAULT_HEADERS = {
    'Content-Type': 'application/json',
    'Accept-Language': 'id-ID',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
};

function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

async function searchAppleMaps(query, lat = -7.191109232975956, lng = 110.39780082066568) {
    if (!query) throw new Error('Query is required');

    const url = 'https://maps.apple.com/data/search';
    
    const requestData = {
        ull: null,
        timeSinceMapViewportChanged: 3,
        sll: { lat: lat, lng: lng },
        span: { latitudeDelta: 1.0990400750823408, longitudeDelta: 0.6432214207610514 },
        dcc: 'ID',
        q: query,
        clientTimeInfo: {
            clientRequestTime: Math.floor(Date.now() / 1000),
            clientTimezoneOffset: -7,
            clientHourOfDay: new Date().getHours(),
            clientDayOfWeek: new Date().getDay()
        },
        analyticMetadata: {
            appIdentifier: 'com.apple.MapsWeb',
            appMajorVersion: '1',
            appMinorVersion: '1.6.496',
            isInternalInstall: false,
            isFromAPI: false,
            requestTime: {
                timeRoundedToHour: Math.floor(Date.now() / 1000),
                timezoneOffsetFromGmtInHours: -7
            },
            serviceTag: { tag: generateUUID() },
            hardwareModel: 'Android',
            osVersion: 'Android 10',
            productName: 'Android',
            sessionId: {
                high: Math.floor(Math.random() * 9007199254740991),
                low: Math.floor(Math.random() * 9007199254740991)
            },
            relativeTimestamp: Math.floor(Math.random() * 1000),
            sequenceNumber: Math.floor(Math.random() * 1000000)
        }
    };

    try {
        const response = await axios.post(url, requestData, { headers: DEFAULT_HEADERS, timeout: 15000 });
        
        const result = {};
        const data = response.data;

        result.query = query;
        result.status = data.status;
        result.places = [];

        if (data.mapsResult && Array.isArray(data.mapsResult)) {
            for (const mapResult of data.mapsResult) {
                if (mapResult.resultType === 'MAPS_RESULT_TYPE_PLACE' && mapResult.place) {
                    const place = mapResult.place;
                    const placeData = {};

                    placeData.muid = place.muid;

                    const entityComponent = place.component?.find(c => c.type === 'COMPONENT_TYPE_ENTITY');
                    if (entityComponent && entityComponent.value?.[0]?.entity) {
                        const entity = entityComponent.value[0].entity;
                        placeData.name = entity.name?.[0]?.stringValue;
                        placeData.website = entity.url;
                        placeData.categories = entity.localizedCategory?.map(c => c.localizedName?.[0]?.stringValue).filter(Boolean);
                    }

                    const addressComponent = place.component?.find(c => c.type === 'COMPONENT_TYPE_ADDRESS_OBJECT');
                    if (addressComponent && addressComponent.value?.[0]?.addressObject) {
                        const addr = addressComponent.value[0].addressObject;
                        placeData.address = addr.formattedAddressLines?.join(', ');
                        placeData.shortAddress = addr.shortAddress;
                        placeData.city = addr.getDisplayLocality;
                    }

                    const locationComponent = place.component?.find(c => c.type === 'COMPONENT_TYPE_PLACE_INFO');
                    if (locationComponent && locationComponent.value?.[0]?.placeInfo) {
                        const loc = locationComponent.value[0].placeInfo;
                        placeData.latitude = loc.center?.lat;
                        placeData.longitude = loc.center?.lng;
                    }

                    const ratingComponent = place.component?.find(c => c.type === 'COMPONENT_TYPE_RATING');
                    if (ratingComponent && ratingComponent.value?.[0]?.rating) {
                        const rating = ratingComponent.value[0].rating;
                        placeData.rating = rating.score;
                        placeData.maxRating = rating.maxScore;
                        placeData.totalRatings = rating.numRatingsUsedForScore;
                    }

                    const photosComponent = place.component?.find(c => c.type === 'COMPONENT_TYPE_CATEGORIZED_PHOTOS');
                    if (photosComponent && photosComponent.value?.[0]?.categorizedPhotos) {
                        placeData.photos = photosComponent.value[0].categorizedPhotos.photo?.map(p => ({
                            caption: p.caption,
                            url: p.photo?.photoVersion?.[0]?.url
                        })).slice(0, 5);
                    }

                    result.places.push(placeData);
                }
            }
        }

        result.totalFound = result.places.length;
        return result;

    } catch (error) {
        throw new Error(`Search failed: ${error.message}`);
    }
}

module.exports = { searchAppleMaps };