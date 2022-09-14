import Button from '@material-ui/core/Button'
import Paper from '@material-ui/core/Paper'
import { makeStyles } from '@material-ui/core/styles'
import Table from '@material-ui/core/Table'
import TableBody from '@material-ui/core/TableBody'
import TableCell from '@material-ui/core/TableCell'
import TableContainer from '@material-ui/core/TableContainer'
import TableHead from '@material-ui/core/TableHead'
import TableRow from '@material-ui/core/TableRow'
import { Modal } from 'app/components/design-system/molecules'
import { updateObject } from 'app/modules/cloud-code'
import React, { useState } from 'react'

const useStyles = makeStyles({
    table: {
        minWidth: 650,
    },
})

const FormManagerTable = ({
    data,
    retrieveCustomData,
    passDataToFormCreator,
    organization,
}) => {
    const [open, setOpen] = useState(false)
    const [selectedForm, setSelectedForm] = useState()
    const classes = useStyles()

    const handleDuplicate = (object) => {
        passDataToFormCreator('duplicate', object)
    }

    const compareOrganizations = (currentOrgs) => {
        if (currentOrgs[0] === 'Shared') return true
        return false
    }

    const handleEdit = (object) => {
        if (
            compareOrganizations(object.organizations) ||
            object.class === 'PuenteFormModifications'
        ) {
            object.organizations = [organization] //eslint-disable-line
            passDataToFormCreator('edit puente form', object)
        } else {
            passDataToFormCreator('edit', object)
        }
    }

    const handleModal = (row) => {
        setOpen(!open)
        setSelectedForm(row)
    }
    const handleRemove = () => {
        const params = {
            parseClass: 'FormSpecificationsV2',
            parseClassID: selectedForm.objectId,
            localObject: {
                active: 'false',
            },
        }

        updateObject(params)
        retrieveCustomData(organization)
        setOpen(!open)
    }

    return (
        <TableContainer component={Paper}>
            <Modal
                open={open}
                handleClose={() => setOpen(!open)}
                text="Do you want to remove this Form"
                action={handleRemove}
                actionText="Remove"
            />
            {data !== undefined ? (
                <Table className={classes.table} aria-label="simple table">
                    <TableHead>
                        <TableRow>
                            {/* {data && headings.map((heading,index)=>(
              <TableCell key={index}>{heading}</TableCell>
            ))} */}
                            <TableCell>Name</TableCell>
                            <TableCell align="right">Description</TableCell>
                            <TableCell align="right">Creation Date</TableCell>
                            <TableCell align="right">Updated Date</TableCell>
                            <TableCell align="right">Actions</TableCell>
                        </TableRow>
                    </TableHead>

                    <TableBody>
                        {data.map((row) => (
                            <TableRow key={row.name}>
                                <TableCell component="th" scope="row">
                                    {row.name}
                                </TableCell>
                                <TableCell align="right">
                                    {row.description}
                                </TableCell>
                                <TableCell align="right">
                                    {row.createdAt}
                                </TableCell>
                                <TableCell align="right">
                                    {row.updatedAt}
                                </TableCell>
                                <TableCell align="right">
                                    <Button
                                        aria-label="duplicate"
                                        onClick={() => handleDuplicate(row)}
                                    >
                                        Duplicate
                                    </Button>
                                    <Button
                                        aria-label="edit"
                                        onClick={() => handleEdit(row)}
                                    >
                                        Edit
                                    </Button>
                                    <Button
                                        aria-label="remove"
                                        onClick={() => handleModal(row)}
                                    >
                                        Remove
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            ) : (
                <h3>No Data Available</h3>
            )}
        </TableContainer>
    )
}

export default FormManagerTable
