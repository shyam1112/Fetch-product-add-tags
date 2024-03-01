const express = require('express');
const router = express.Router();
const axios = require('axios');
const ExcelJS = require('exceljs');
const fs = require('fs');
const Bottleneck = require('bottleneck');

const excelFilePath = 'Maxwell Leadership - Inventory.xlsx';

const shopName =process.env.SHOPNAME;
const accessToken = process.env.ACCESS_TOKEN;
const apiVersion = '2024-01';
const url = `https://${shopName}/admin/api/${apiVersion}`;

const limiter = new Bottleneck({ maxConcurrent: 1, minTime: 1000 });

router.get('/', async (req, res) => {
    try {
        const response = await axios.get(`${url}/products.json?limit=250`, {
            headers: {
                'Content-Type': 'application/json',
                'X-Shopify-Access-Token': accessToken,
            }
        });

        const products = response.data.products;

        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(excelFilePath);
        const worksheet = workbook.getWorksheet(1);
        const uniqueItems = {};
        let i = 1;

        worksheet.eachRow({ includeEmpty: false }, async (row, rowNumber) => {
            const column2Data = row.getCell(2).value;
            const column13Data = row.getCell(13).value;
            const column14Data = row.getCell(14).value;

            if (!uniqueItems[column2Data]) {
                uniqueItems[column2Data] = true;
                i++;

                const product = products.find(product => product.title === column2Data);
                if (product) {
                    await limiter.schedule(() => updateProduct(product.id,column13Data,column14Data));
                } else {
                    fs.appendFile('NotGetProduct.txt', `${i} | Row ${rowNumber} | ${column2Data} | ${column13Data} | ${column14Data}\n`, function (err) {
                        if (err) throw err;
                    });
                }
            }
        });

        res.send("Product details updated.");
    } catch (error) {
        console.error('Error processing the Excel file or fetching data:', error);
        res.status(500).send('Internal Server Error');
    }
});

const updateProduct = async (productId, tag1, tag2) => {
    try {
        const updatedUrl = `${url}/products/${productId}.json`;

        let tags = [];

        if (tag1 != null) {
            tags.push(tag1);
        }

        if (tag2 != null) {
            tags.push(tag2);
        }

        const response = await axios.put(updatedUrl, {
            product: {
                tags: tags.join(', '), // Join tags with a comma and space
            },
        }, {
            headers: {
                'Content-Type': 'application/json',
                'X-Shopify-Access-Token': accessToken,
            }
        });

        if(response){
            fs.appendFile('updatedId.txt', `${productId}\n`, function (err) {
                if (err) throw err;
            });
        }else{
            fs.appendFile('NotupdatedId.txt', `${productId}\n`, function (err) {
                if (err) throw err;
            });
        }

        // console.log(response.data.product.tags);

    } catch (error) {
        fs.appendFile('updatedFailed.txt', `${productId}\n`, function (err) {
            if (err) throw err;
        });
        console.error('Error updating product:', error);
    }
};


module.exports = router;
