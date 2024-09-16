import express from 'express';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

router.post('/api', (req, res) => {
    const postedData = req.body;

    const getDate = (date) => {
        const [day, month, year] = date.split('-');
        return `${year}-${month}-${day}`; // Convert from DD-MM-YYYY to YYYY-MM-DD
    };

    console.log('posted data is', postedData);
    const authData = {
        "grant_type": "client_credentials",
        "client_id": process.env.CLIENT_ID,
        "client_secret": process.env.CLIENT_SECRET,
        "resource": "api://7b630d9c-e7c3-4e3e-81aa-0d563c52e59a"
    };

    let formBody = [];
    for (let property in authData) {
        let encodedKey = encodeURIComponent(property);
        let encodedValue = encodeURIComponent(authData[property]);
        formBody.push(`${encodedKey}=${encodedValue}`);
    }
    formBody = formBody.join("&");

    const getTotalQuantity = (data) => {
        return data.line_items.reduce((total, item) => total + item.quantity, 0);
    };

    const totalQuantity = getTotalQuantity(postedData);
    console.log("totalQuantity:", totalQuantity);

    fetch('https://login.windows.net/6285e18b-e740-4114-8649-2d299e642afc/oauth2/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
        },
        body: formBody
    })
        .then(res => res.json())
        .then(json => {
            // Initialize arrays to hold dates and remarks
            const culiWalkDates = [];
            const culiWalkRemarks = [];

            // Loop through each line item to collect dates and remarks
            postedData.line_items.forEach(item => {
                if (item.properties.length) {
                    culiWalkDates.push(getDate(item.properties[0].value));
                    culiWalkRemarks.push(item.properties[1].value);
                }
            });

            console.log("culiWalkDates:", culiWalkDates);
            console.log("culiWalkRemarks:", culiWalkRemarks);

            const tourSaleData = {
                "name": postedData.name,
                "emailaddress": postedData.email,
                "source": postedData.source_name,
                "number": totalQuantity,
                "walkingRouteShortName": postedData.line_items[0].sku, // Assuming SKU is same for all items
                "idealDetails": "WWqHTVbf2V",
                "date": postedData.created_at,
                "amountPaid": postedData.current_subtotal_price,
                "currency": postedData.currency,
                "language": postedData.customer_locale,
                "isAffiliate": false,
                "culiWalkDate": culiWalkDates.length ? culiWalkDates[0] : null,
                "culiWalkRemarks": culiWalkRemarks.length ? culiWalkRemarks[0] : null
            };

            return fetch('https://positivebytes-pg-routes-api-prd.azurewebsites.net/positivebytes/pocketguide/tours/sale', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${json.access_token}`,
                    'X-TrackingId': postedData.id
                },
                body: JSON.stringify(tourSaleData)
            });
        })
        .then(res => res.json())
        .then(response => {
            // handle response from your API
            console.log('Tour Sale Response:', response, response.error);
        })
        .catch(err => {
            console.error('Error:', err);
        });

    res.status(200).send('Request received'); // Send a response back to Shopify webhook.
});

export default router;
