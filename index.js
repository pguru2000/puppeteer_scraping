const puppeteer = require('puppeteer');
const fs = require('fs');
var path = require('path');


var base_url    = "https://www.walgreens.com";
var output_path = "output";

class walgreensScraper {
    constructor() {
        this.browser = null;
        this.page = null;
        this.categories = [];
    }

    async init() {
        this.browser = await puppeteer.launch({
            headless: false,
            defaultViewport: null,
        });
        this.page = await this.browser.newPage();
        await this.goto(base_url);
        await this.getCategories();

        if (!fs.existsSync(output_path)){
            fs.mkdirSync(output_path);
        }

    }

    async goto(url) {
        await this.page.goto(url, {
            waitUntil: "domcontentloaded",
        });
    }

    async getCategories() {
        var result = []; 
        var footer_blocks = await this.page.$$(".footer__bottom-section ul");
        
        if ( footer_blocks.length > 0 ) {
            var category_block = footer_blocks[0];
            result = await category_block.$$eval("a", el => el.map(x => x.getAttribute("href")));
        }
        this.categories = result;
    }

    async getSubCategories(category_name) {
        var _dom;
        if ( category_name == "Household & Pet Essentials" )
            _dom = "#shop-by-needs";

        var result = [];
        if ( _dom ) {
            var _element = await this.page.$(_dom);        
            result = _element ? await _element.$$eval("a", el => el.map(x => x.getAttribute("href"))) : [];
        }        
        return result;
    }

    async getProductPages(sub_category_url){
        var result = [];
        var _element = await this.page.$('.product-card-container');  
        var result = _element ? await _element.$$eval("a[tabindex='-1']", el => el.map(x => x.getAttribute("href"))) : [];
        return result;
    }

    async scrapeProduct(url, index) {
        await this.goto(base_url + url);
        var _element = await this.page.$('#productTitle');
        var product_name = _element? await _element.evaluate(el => el.textContent) : "";

        _element = await this.page.$('#regular-price-wag-hn-lt-bold');
        var listPrice = _element? await _element.evaluate(el => el.textContent) : "";
        
        _element = await this.page.$('#prodDesc');
        var description = _element? await _element.evaluate(el => el.textContent) : "";

        _element = await this.page.$('.universal-product-inches');
        var productDimensions = _element? await _element.evaluate(el => el.textContent) : "";

        _element = await this.page.$('#thumbnailImages');
        var imageURLs = _element? await _element.$$eval("img", el => el.map(x => x.getAttribute("src"))) : [];
        if ( imageURLs.length == 0 ) {
            _element = await this.page.$('#zoomLensContainer');
            imageURLs = _element? await _element.$$eval("img", el => el.map(x => x.getAttribute("src"))) : [];
        }

        imageURLs = imageURLs.map( item => !item.startsWith("http") ? "https:" + item : item );

        _element = await this.page.$('#prodSpecCont');
        var productUPC = "";
        if ( _element ) {
            var tr_elements = await _element.$$('tr');
            for ( const tr_element of tr_elements ) {
                var th_element = await tr_element.$('th');
                var td_element = await tr_element.$('td');
                if ( th_element && td_element) {
                    var spec_title = await th_element.evaluate(el => el.textContent);
                    if (spec_title == "UPC:") {
                        productUPC = await td_element.evaluate(el => el.textContent);
                        break;
                    }
                }
            }
        }
        var product = {
            id                  : index,
            productName         : product_name,
            listPrice           : listPrice,
            description         : description,
            productDimensions   : productDimensions.split(":").length == 2 ? productDimensions.split(":")[1].trim() : productDimensions,
            imageURLs           : imageURLs,
            productUPC          : productUPC,
            sourceURL           : base_url + url
        }
        return product;
    }

    async getCategoryName() {
        var _element = await this.page.$('.h1__page-title');
        var name = _element? await _element.evaluate(el => el.textContent) : "";
        return name;
    }

    async getSubCategoryName() {
        var _element = await this.page.$('.page__title');
        var name = _element ? await _element.evaluate(el => el.textContent) : "";
        return name;
    }

    async writeToJson(category_name, sub_category_name, products) {
        if (!fs.existsSync(path.join(output_path, category_name))){
            fs.mkdirSync(path.join(output_path, category_name));
        }
        const jsonString = JSON.stringify(products, null, 4);
        var file_path = path.join( output_path, category_name, sub_category_name + ".json" );
        fs.writeFileSync(file_path, jsonString);
    }

    async main() {
        
        for ( const category of this.categories ) {
            
            if ( category != "/store/c/household-essentials/ID=20000910-tier1" )
                continue
            
            await this.goto(base_url + category);
            var category_name = await this.getCategoryName();
            if ( category_name == "" )
                continue

            var sub_category_list = await this.getSubCategories(category_name);
            for ( const sub_category_url of sub_category_list ) {
                await this.goto(base_url + sub_category_url);
                var sub_category_name = await this.getSubCategoryName();

                var products = [];
                var product_link_list = await this.getProductPages();
                for ( const [index, product_link] of product_link_list.entries() ) {
                    var product = await this.scrapeProduct(product_link, index+1 );
                    products.push(product);
                }
                if ( products.length > 0 )
                    await this.writeToJson(category_name, sub_category_name, products);
            }            
        }
    }

    async close() {
        await this.browser.close();
    }
}

(async () => {
    const scraper = new walgreensScraper();

    await scraper.init();
    await scraper.main();
    await scraper.close();
})();