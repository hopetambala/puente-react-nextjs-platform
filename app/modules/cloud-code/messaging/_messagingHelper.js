const text = (data) => {
    const { phonenumber } = data
    return {
        runMessaging: true,
        path: 'text',
        data: {
            textTo: phonenumber,
            type: 'passwordReset',
        },
    }
}

const email = (data) => {
    const { objectId, firstname, lastname, emailAddress } = data
    return {
        runMessaging: true,
        path: 'email',
        data: {
            emailSubject: 'Account Reset for Puente',
            objectId,
            userFullName: `${firstname} ${lastname}`,
            emailAddress,
            type: 'passwordReset',
        },
    }
}

const notificationTypeRestParams = (type, data) => {
    if (type === 'text') return text(data)
    if (type === 'email') return email(data)
    return null
}

export default notificationTypeRestParams
