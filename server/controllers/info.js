/**
 * Miscellaneous information from database
 */


const getAttributes = async (request, h) => {
    try {
        if (!request.auth.isAuthenticated) {
            return h.response({ message: 'Forbidden', code: "xemp-1" }).code(401);
        }
        let { Attributeset } = request.getModels('xpaxr');
            let attributes = await Attributeset.findAll({
                attributes:["attributeId","attributeName"],
                order: [["attributeId", "ASC"]]
            });
        return h.response(attributes).code(200);
    }
    catch (error) {
        console.error(error.stack);
        return h.response({ error: true, message: 'Bad Request' }).code(400);
    }
}

module.exports = {
    getAttributes,
}