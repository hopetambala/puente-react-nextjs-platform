import Box from '@material-ui/core/Box'
import Button from '@material-ui/core/Button'
import Collapse from '@material-ui/core/Collapse'
import IconButton from '@material-ui/core/IconButton'
import LinearProgress from '@material-ui/core/LinearProgress'
import CloseIcon from '@material-ui/icons/Close'
import Alert from '@material-ui/lab/Alert'
import React, { useState } from 'react'
import { CSVLink } from 'react-csv'

import {
    getDataFromS3,
    retrieveCleanedData,
} from '../../../../services/awsApiGateway'

const SubmitButton = ({
    handleSubmit,
    surveyingOrganization,
    specifier,
    customFormId,
    csvData,
    setCsvData,
}) => {
    const [open, setOpen] = useState(false)
    const [progress, setProgress] = useState(0)
    const [downloading, setDownloading] = useState(false)

    const startProgressBar = () => {
        setProgress(0)
        const timer = setInterval(() => {
            setProgress((oldProgress) => {
                if (oldProgress === 100 || downloading === true) {
                    clearInterval(timer)
                }
                return oldProgress + 10
                // const diff = Math.random() * 10;
                // return Math.min(oldProgress + diff, 100);
            })
        }, 500)

        return () => {
            clearInterval(timer)
        }
    }

    const handleClick = () => {
        setDownloading(true)
        startProgressBar()
        handleSubmit()
        retrieveCleanedData(specifier, customFormId, surveyingOrganization)
            .then((results) => {
                // there was an error during the request
                if (results.error !== undefined)
                    throw new Error(
                        'Request Failed, ensure paramaters for request are correct and try again.'
                    )
                return results.s3_url
            })
            .then(
                (s3Url) => {
                    getDataFromS3(s3Url).then(
                        (response) => {
                            setCsvData(response)
                            setDownloading(false)
                            setProgress(100)
                        },
                        () => {
                            setDownloading(false)
                            setProgress(100)
                        }
                    )
                },
                () => {
                    setOpen(true)
                    setDownloading(false)
                    setProgress(100)
                }
            )
    }

    return (
        <div>
            <div>
                <Button variant="contained" onClick={() => handleClick()}>
                    Submit
                </Button>
                {csvData !== undefined && csvData.length > 0 && (
                    <CSVLink
                        data={csvData}
                        filename={
                            customFormId !== undefined
                                ? `${specifier}-${customFormId}.csv`
                                : `${specifier}.csv`
                        }
                    >
                        <Button variant="contained">Download Data</Button>
                    </CSVLink>
                )}
                {downloading && progress !== 0 && (
                    <Box>
                        <LinearProgress
                            variant="determinate"
                            value={progress}
                        />
                    </Box>
                )}
            </div>
            <div>
                <Collapse in={open}>
                    <Alert
                        severity="error"
                        action={
                            <IconButton
                                aria-label="close"
                                color="inherit"
                                size="small"
                                onClick={() => {
                                    setOpen(false)
                                }}
                            >
                                <CloseIcon fontSize="inherit" />
                            </IconButton>
                        }
                    >
                        Oops.. there was an error with your request, please try
                        again or contact your manager if the issue persists.
                    </Alert>
                </Collapse>
            </div>
        </div>
    )
}

export default SubmitButton
