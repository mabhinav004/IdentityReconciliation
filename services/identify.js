const {getMatchingIdentity, getIdentitiesByLinkedId, createNewIdentity,
    updateIdentityLinkedId, updateIdentityToSecondary, getIdentityById} = require('../database/databases')

const LINK_PRECEDENCE = {
    PRIMARY: 'primary',
    SECONDARY: 'secondary'
}

const getIdentifyData = async ({requestData}) => {
    try {
        /*
        Getting identities which matches the request identity.
         */
        const matchedIdentities = await getMatchingIdentity({requestData})

        if (matchedIdentities == null) {
            return {
                statusCode: 500,
                data: createResponseBody({})
            }
        }

        if (matchedIdentities.length > 0) {

            let matchedPrimaryIdentities = []

            /*
            Getting primary identities from matched identities.
            */
            matchedIdentities.forEach(identity => {
                if (identity.linkPrecedence === LINK_PRECEDENCE.PRIMARY) matchedPrimaryIdentities.push(identity)
            })

            if (matchedPrimaryIdentities.length > 1) {

                /*
                for the case when two primary identities is matched.
                 */
                if (matchedPrimaryIdentities[0].id < matchedPrimaryIdentities[1].id) {

                    /*
                      Primary identity will be converted into secondary here.
                     */
                    await updateIdentityToSecondary({
                        id: matchedPrimaryIdentities[1].id,
                        newLinkedId: matchedPrimaryIdentities[0].id,
                        linkPrecedence: LINK_PRECEDENCE.SECONDARY
                    })

                    /*
                    updating linkedId of secondary identities corresponding to second primary identities
                    into first primary identity.
                     */
                    await updateIdentityLinkedId({
                        oldLinkedId: matchedPrimaryIdentities[1].id,
                        newLinkedId: matchedPrimaryIdentities[0].id
                    })

                    return makeResponseData({ primaryIdentityId: matchedPrimaryIdentities[0].id })
                } else {
                    await updateIdentityToSecondary({
                        id: matchedPrimaryIdentities[0].id,
                        newLinkedId: matchedPrimaryIdentities[1].id,
                        linkPrecedence: LINK_PRECEDENCE.SECONDARY
                    })

                    await updateIdentityLinkedId({
                        oldLinkedId: matchedPrimaryIdentities[0].id,
                        newLinkedId: matchedPrimaryIdentities[1].id
                    })

                    return makeResponseData({ primaryIdentityId: matchedPrimaryIdentities[1].id })
                }

            } else {

                let primaryIdentity

                /*
                  getting primary identity
                 */
                if (matchedPrimaryIdentities.length === 0) {

                    /*
                    case of zero primary identity matched.
                    getting primary identity using linkedId of secondary identity.
                    */
                    const primaryIdentityList = await getIdentityById({ id: matchedIdentities[0].linkedId})
                    primaryIdentity = primaryIdentityList[0]

                } else {

                    /*
                    case of one primary identity matched.
                    getting primary identity using linkedId of secondary identity.
                    */
                    primaryIdentity = matchedPrimaryIdentities[0]
                }

                /*
                    getting secondary identities corresponding to primary identity.
                 */
                const secondaryList = await getIdentitiesByLinkedId({ linkedId: primaryIdentity.id })

                /*
                   checking if requested data already exists or not.
                 */
                const isExactMatchExist = checkForExactMatch({
                    requestData,
                    secondaryList,
                    primaryIdentity
                })

                if (isExactMatchExist) {

                    return makeResponseData({ primaryIdentityId: primaryIdentity.id })

                } else {

                    /*
                      creating new entry for unmatched requested identity.
                     */
                    const requestBody  = {
                        ...requestData,
                        linkedId: primaryIdentity.id,
                        linkPrecedence: LINK_PRECEDENCE.SECONDARY
                    }
                    await createNewIdentity({ requestBody })

                    return makeResponseData({ primaryIdentityId: primaryIdentity.id })
                }
            }
        } else {

            /*
              creating new entry for requested identity.
             */
            const requestBody  = {
                ...requestData,
                linkedId: null,
                linkPrecedence: LINK_PRECEDENCE.PRIMARY
            }
            const primaryIdentityId = await createNewIdentity({ requestBody })
            return makeResponseData({ primaryIdentityId })
        }
    } catch (err) {
        return {
            statusCode: 500,
            data: createResponseBody({})
        }
    }

}

/*
  Below method is used for checking if identity is already existing or not
 **/
const checkForExactMatch = ({ requestData, secondaryList, primaryIdentity }) => {
    let isExactMatchExist = false

    if (!requestData.email) {
        secondaryList.forEach(identity => {
            if (requestData.phoneNumber === identity.phoneNumber) {
                isExactMatchExist = true
            }
        })
        if (requestData.phoneNumber === primaryIdentity.phoneNumber) {
            isExactMatchExist = true
        }
    } else if (!requestData.phoneNumber) {
        secondaryList.forEach(identity => {
            if (requestData.email === identity.email) {
                isExactMatchExist = true
            }
        })
        if (requestData.email === primaryIdentity.email) {
            isExactMatchExist = true
        }
    } else {
        secondaryList.forEach(identity => {
            if (requestData.phoneNumber === identity.phoneNumber && requestData.email === identity.email) {
                isExactMatchExist = true
            }
        })
        if (requestData.phoneNumber === primaryIdentity.phoneNumber && requestData.email === primaryIdentity.email) {
            isExactMatchExist = true
        }
    }
    return isExactMatchExist
}

/*
  Below method is used for making response using
  primaryIdentityId after completion of operations on db.
 **/
const makeResponseData = async ({ primaryIdentityId }) => {
    let secondaryIdentityList, primaryIdentity
    try {
        /*
        Getting list of secondary data corresponding to primary id
        **/
        secondaryIdentityList = await getIdentitiesByLinkedId({ linkedId: primaryIdentityId })
        const primaryIdentityList = await getIdentityById({ id: primaryIdentityId })
        primaryIdentity = primaryIdentityList[0]
    } catch (e) {
        throw e
    }

    const emailSet = new Set()
    const phoneNumberSet = new Set()
    const secondaryContactIds = []

    /*
      Removing Duplicate email and phone number using set.
     **/
    secondaryIdentityList.forEach(identity => {
        if (identity.email) emailSet.add(identity.email)
        if (identity.phoneNumber) phoneNumberSet.add(identity.phoneNumber)
        secondaryContactIds.push(identity.id)
    })

    let emails = [...emailSet]
    let phoneNumbers = [...phoneNumberSet]

    /*
      Adding primary email at first position
     **/
    if (primaryIdentity.email){
        const primaryEmailIndex = emails.indexOf(primaryIdentity.email)
        if (primaryEmailIndex > -1) {
            emails.splice(primaryEmailIndex, 1)
        }
        emails = [primaryIdentity.email, ...emails]
    }

    /*
      Adding primary phoneNumber at first position
     **/
    if (primaryIdentity.phoneNumber){
        const primaryPhoneNumberIndex = phoneNumbers.indexOf(primaryIdentity.phoneNumber)
        if (primaryPhoneNumberIndex > -1) {
            phoneNumbers.splice(primaryPhoneNumberIndex, 1)
        }
        phoneNumbers = [primaryIdentity.phoneNumber, ...phoneNumbers]
    }

    return {
        statusCode: 200,
        data: createResponseBody({
            primaryContatctId: primaryIdentity.id,
            emails,
            phoneNumbers,
            secondaryContactIds
        })
    }

}

/*
  Below method is used for converting data into required response format
 **/
const createResponseBody = ({ primaryContatctId, emails, phoneNumbers, secondaryContactIds }) => {
    return 	{
        contact: {
            primaryContatctId: primaryContatctId,
            emails: emails,
            phoneNumbers: phoneNumbers,
            secondaryContactIds: secondaryContactIds
        }
    }
}

module.exports = {
    getIdentifyData
}