const mysql = require('mysql')
const util = require('util')

const conn = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "abhi123",
    database: "identity_reconciliation"
})

const query = util.promisify(conn.query).bind(conn)

const getMatchingIdentity = async ({ requestData }) => {
    let resultData = []
    let queryString = '', data

    if (!requestData.phoneNumber) {
        queryString = "SELECT * FROM Contact WHERE email = ?"
        data = [requestData.email]
    } else if (!requestData.email) {
        queryString = "SELECT * FROM Contact WHERE phoneNumber = ?"
        data = [requestData.phoneNumber]
    } else {
        queryString = "SELECT * FROM Contact WHERE phoneNumber = ? OR email = ?"
        data = [requestData.phoneNumber, requestData.email]
    }

    try {
        const result = await query(queryString, data);
        resultData = Object.values(JSON.parse(JSON.stringify(result)))
    } catch (e) {
        throw e
    }

    return resultData
}

const getIdentitiesByLinkedId = async ({ linkedId }) => {
    let resultData = []

    const queryString = "SELECT * FROM Contact WHERE linkedId = ?"
    const data = [linkedId]

    try {
        const result = await query(queryString, data);
        resultData = Object.values(JSON.parse(JSON.stringify(result)))
    } catch (e) {
        throw e
    }

    return resultData
}

const getIdentityById = async ({ id }) => {
    let resultData = []

    const queryString = "SELECT * FROM Contact WHERE id = ?"
    const data = [id]

    try {
        const result = await query(queryString, data);
        resultData = Object.values(JSON.parse(JSON.stringify(result)))
    } catch (e) {
        throw e
    }

    return resultData
}

const createNewIdentity = async ({ requestBody }) => {
    const queryString = "INSERT INTO Contact (phoneNumber, email, linkedId, linkPrecedence, createdAt, updatedAt, deletedAt) VALUES ?"
    const data = [
        [requestBody.phoneNumber, requestBody.email, requestBody.linkedId, requestBody.linkPrecedence, new Date(), new Date(), null]
    ]

    let result
    try {
        result = await query(queryString, [data]);
    } catch (e) {
        throw e
    }
    return result.insertId
}

const updateIdentityLinkedId = async ({ oldLinkedId, newLinkedId}) => {
    const queryString = "UPDATE Contact SET linkedId = ?, updatedAt = ? WHERE linkedId = ?"
    const data = [newLinkedId, new Date(), oldLinkedId]

    try {
        const result = await query(queryString, data);
    } catch (e) {
        throw e
    }
}

const updateIdentityToSecondary = async ({ id, newLinkedId, linkPrecedence}) => {
    const queryString = "UPDATE Contact SET linkedId = ?, linkPrecedence = ?, updatedAt = ? WHERE id = ?"
    const data = [newLinkedId, linkPrecedence, new Date(), id]

    try {
        const result = await query(queryString, data);
    } catch (e) {
        throw e
    }
}

module.exports = {
    getMatchingIdentity,
    getIdentitiesByLinkedId,
    createNewIdentity,
    updateIdentityLinkedId,
    updateIdentityToSecondary,
    getIdentityById
}