const File = require('dw/io/File');
const FileWriter = require('dw/io/FileWriter');
const XMLStreamWriter = require('dw/io/XMLStreamWriter');
const ProductInventoryMgr = require('dw/catalog/ProductInventoryMgr');
const Logger = require('dw/system/Logger');

const Directories = require('~/cartridge/scripts/lib/Directories');
const writeXMLElement = require('~/cartridge/scripts/util').writeXMLElement;

module.exports = {
    exportInventoryList: function (setsOfProducts, directoryName) {
        const directoryPath = [
            Directories.FOLDER('catalogreducer'),
            directoryName,
            'inventory-lists'
        ].join(File.SEPARATOR) + File.SEPARATOR;

        Directories.createDirectory(directoryPath);

        const inventoryList = ProductInventoryMgr.getInventoryList();

        if (!inventoryList) {
            Logger.warn('No inventory list assigned for current site. Unable to write inventories.');

            return;
        }

        const file = new File(directoryPath + inventoryList.ID + '.xml');
        file.createNewFile();

        const fileWriter = new FileWriter(file, 'UTF-8');
        const xmlWriter = new XMLStreamWriter(fileWriter);

        xmlWriter.writeStartDocument('UTF-8', '1.0');
        xmlWriter.writeStartElement('inventory');
        xmlWriter.writeAttribute('xmlns', 'http://www.demandware.com/xml/impex/inventory/2007-05-31');
        xmlWriter.writeStartElement('inventory-list');

        xmlWriter.writeStartElement('header');
        xmlWriter.writeAttribute('list-id', inventoryList.ID);

        writeXMLElement(xmlWriter, 'default-instock', inventoryList.getDefaultInStockFlag());
        writeXMLElement(xmlWriter, 'description', inventoryList.getDescription());

        xmlWriter.writeEndElement(); // header

        xmlWriter.writeStartElement('records');

        // still need to close 'inventory-list', 'inventory', and 'records'

        const setsItr = setsOfProducts.iterator();

        while (setsItr.hasNext()) {
            let set = setsItr.next();
            let productItr = set.iterator();

            while (productItr.hasNext()) {
                let p = productItr.next();

                if (!p.isMaster()) {
                    let invRecord = p.getAvailabilityModel().getInventoryRecord();

                    if (invRecord) {
                        xmlWriter.writeStartElement('record');
                        xmlWriter.writeAttribute('product-id', p.getID());
                        writeXMLElement(xmlWriter, 'allocation', invRecord.allocation.value);
                        xmlWriter.writeEndElement();
                    }
                }
            }
        }

        xmlWriter.writeEndElement(); // records
        xmlWriter.writeEndElement(); // inventory
        xmlWriter.writeEndElement(); // inventory-list

        xmlWriter.flush();
        xmlWriter.close();
        fileWriter.flush();
        fileWriter.close();
    }
}
