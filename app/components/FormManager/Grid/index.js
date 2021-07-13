import Button from '@material-ui/core/Button';
import Paper from '@material-ui/core/Paper';
import { makeStyles } from '@material-ui/core/styles';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Modal from 'app/components/UI/Modal';
import { removeQueryService } from 'app/services/parse';
import React, { useState } from 'react';
import Card from './Card';

const useStyles = makeStyles({
  table: {
    minWidth: 650,
  },
});

const FormManagerGrid = ({
  data,
  retrieveCustomData, passDataToFormCreator,
  organization,
}) => {

    return (
        <div style={{ 
            display: 'flex',
            flexDirection: 'row',
            // alignItems: 'center',
            // justifyContent: 'center',
            flexWrap: 'wrap',
  
            // maxWidth: '800px',
            marginTop: '3rem'
            
            }}>
        {data.map((row) => (
            <Card
                title={row.name}
                description={row.description}
            />
        ))}
        </div>
    );
};

export default FormManagerGrid;