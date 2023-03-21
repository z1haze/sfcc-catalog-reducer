module.exports = {
    copyCookies: function() {
        const cookies = request.getHttpCookies();
        let newCookies = '';

        // @formatter:off
        for each (var cookie in cookies) {
            if (newCookies.length > 0) {
                newCookies += ';';
            }

            newCookies += cookie.getName() + '=' + cookie.getValue();
        }
        // @formatter:on

        return newCookies;
    },

    writeXMLElement: function(writer, name, value, attributes) {
        writer.writeStartElement(name);

        if (typeof attributes === 'undefined') {
            attributes = [];
        }

        attributes.forEach((attr) => {
            writer.writeAttribute(attr[0], attr[1]);
        });

        if (typeof value !== 'undefined' && value !== null) {
            writer.writeCharacters(value);
        }

        writer.writeEndElement();
    }
}
