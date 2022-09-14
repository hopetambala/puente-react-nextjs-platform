import { Parse } from 'parse'

import {
    customMultiParamQueryService,
    customQueryService,
    removeQueryService,
} from './custom-queries'

function residentIDQuery(params) {
    return new Promise((resolve, reject) => {
        Parse.Cloud.run('basicQuery', params).then(
            (result) => {
                resolve(result)
            },
            (error) => {
                reject(error)
            }
        )
    })
}

function postObjectsToClass(params) {
    return new Promise((resolve, reject) => {
        Parse.Cloud.run('postObjectsToClass', params).then(
            (result) => {
                resolve(result)
            },
            (error) => {
                reject(error)
            }
        )
    })
}

function postObjectsToClassWithRelation(params) {
    return new Promise((resolve, reject) => {
        Parse.Cloud.run('postObjectsToClassWithRelation', params).then(
            (result) => {
                resolve(result)
            },
            (error) => {
                reject(error)
            }
        )
    })
}

function getObjectsByGeolocation(params) {
    return new Promise((resolve, reject) => {
        Parse.Cloud.run('geoQuery', params).then(
            (result) => {
                resolve(result)
            },
            (error) => {
                reject(error)
            }
        )
    })
}

function updateObject(params) {
    return new Promise((resolve, reject) => {
        Parse.Cloud.run('updateObject', params).then(
            (result) => {
                resolve(result)
            },
            (error) => {
                reject(error)
            }
        )
    })
}

/**
 * Performs a query based on the parameter defined in a column
 *
 * @example
 * countService(SurveyData,surveyingUser,Jeff)
 *
 * @param {string} parseModel Name of Backend Model
 * @param {string} parseColumn Name of Column in Backend Model
 * @param {string} parseParam Name of Parameter in Column
 * @returns Count of Query
 */
function countObject(parseModel, parseColumn, parseParam) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            const Model = Parse.Object.extend(parseModel)

            const query = new Parse.Query(Model)

            query.equalTo(parseColumn, parseParam)

            query.count().then(
                (count) => {
                    resolve(count)
                },
                (error) => {
                    reject(error)
                }
            )
        }, 1500)
    })
}

export {
    countObject,
    customMultiParamQueryService,
    customQueryService,
    getObjectsByGeolocation,
    postObjectsToClass,
    postObjectsToClassWithRelation,
    removeQueryService,
    residentIDQuery,
    updateObject,
}
