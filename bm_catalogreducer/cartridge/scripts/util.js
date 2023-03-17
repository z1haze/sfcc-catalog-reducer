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
    }
}