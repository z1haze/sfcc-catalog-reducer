const File = require('dw/io/File');
const FileWriter = require('dw/io/FileWriter');
const XMLStreamWriter = require('dw/io/XMLStreamWriter');
const PriceBookMgr = require('dw/catalog/PriceBookMgr');

const Directories = require('~/cartridge/scripts/lib/Directories');
const writeXMLElement = require('~/cartridge/scripts/util').writeXMLElement;

module.exports = {
    exportPricebooks: function (setsOfProducts, directoryName) {
        const directoryPath = [
            Directories.FOLDER('catalogreducer'),
            directoryName,
            'pricebooks'
        ].join(File.SEPARATOR) + File.SEPARATOR;

        Directories.createDirectory(directoryPath);

        // filter online pricebooks
        const configs = [].filter.call(PriceBookMgr.getSitePriceBooks(), pricebook => pricebook.online)
            .map(pricebook => {
                const file = new File(directoryPath + pricebook.ID + '.xml');
                file.createNewFile();
                const fileWriter = new FileWriter(file, 'UTF-8');
                const xmlWriter = new XMLStreamWriter(fileWriter);

                xmlWriter.writeStartDocument('UTF-8', '1.0');
                xmlWriter.writeStartElement('pricebooks');
                xmlWriter.writeAttribute('xmlns', 'http://www.demandware.com/xml/impex/pricebook/2006-10-31');
                xmlWriter.writeStartElement('pricebook');

                xmlWriter.writeStartElement('header');
                xmlWriter.writeAttribute('pricebook-id', pricebook.ID);

                writeXMLElement(xmlWriter, 'currency', pricebook.currencyCode);
                writeXMLElement(xmlWriter, 'display-name', pricebook.displayName, [['xml:lang', 'x-default']]);
                writeXMLElement(xmlWriter, 'online-flag', pricebook.online);

                if (pricebook.parentPriceBook) {
                    writeXMLElement(xmlWriter, 'parent', pricebook.parentPriceBook.ID);
                }

                xmlWriter.writeEndElement(); // header

                xmlWriter.writeStartElement('price-tables');

                // still need to close 'price-tables', 'pricebook', and 'pricebooks'

                return {
                    ID: pricebook.ID,
                    displayName: pricebook.displayName,
                    currencyCode: pricebook.currencyCode,
                    parentPriceBook: pricebook.parentPriceBook,
                    fileWriter: fileWriter,
                    xmlWriter: xmlWriter
                }
            });

        const setsItr = setsOfProducts.iterator();

        while (setsItr.hasNext()) {
            let set = setsItr.next();
            let productItr = set.iterator();

            while (productItr.hasNext()) {
                let p = productItr.next();

                if (!p.isMaster()) {
                    configs.forEach(config => {
                        const price = p.getPriceModel().getPriceBookPrice(config.ID);

                        if (price.valueOrNull !== null) {
                            config.xmlWriter.writeStartElement('price-table');
                            config.xmlWriter.writeAttribute('product-id', p.getID());
                            writeXMLElement(config.xmlWriter, 'amount', price.value, [['quantity', 1]])
                            config.xmlWriter.writeEndElement();
                        }
                    });
                }
            }
        }

        // close up remaining open elements and close the writers
        configs.forEach(config => {
            config.xmlWriter.writeEndElement(); // price-tables
            config.xmlWriter.writeEndElement(); // pricebook
            config.xmlWriter.writeEndElement(); // pricebooks

            config.xmlWriter.flush();
            config.xmlWriter.close();
            config.fileWriter.flush();
            config.fileWriter.close();
        });
    }
}
