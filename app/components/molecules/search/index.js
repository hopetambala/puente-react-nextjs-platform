import { makeStyles } from '@material-ui/core/styles';
import TextField from '@material-ui/core/TextField';
import Autocomplete from '@material-ui/lab/Autocomplete';
import React from 'react';

const top100Films = [
  { title: 'The Shawshank Redemption', year: 1994 },
  { title: 'The Godfather', year: 1972 },
  { title: 'The Godfather: Part II', year: 1974 },
  { title: 'The Dark Knight', year: 2008 },
  { title: '12 Angry Men', year: 1957 },
  { title: "Schindler's List", year: 1993 },
  { title: 'Pulp Fiction', year: 1994 },
  { title: 'The Lord of the Rings: The Return of the King', year: 2003 },
  { title: 'Fight Club', year: 1999 },
  { title: 'The Lord of the Rings: The Fellowship of the Ring', year: 2001 },
];

const useStyles = makeStyles((theme) => ({
  root: {
    width: 500,
    '& > * + *': {
      marginTop: theme.spacing(3),
    },
  },
}));

export default function SearchBar() {
  const classes = useStyles();

  return (
    <div className={classes.root}>
      <Autocomplete
        multiple
        id="tags-outlined"
        options={top100Films}
        getOptionLabel={(option) => option.title}
        defaultValue={[top100Films[1]]}
        filterSelectedOptions
        renderInput={(params) => (
          <TextField
            {...params}
            variant="outlined"
            label="filterSelectedOptions"
            placeholder="Favorites"
          />
        )}
      />

    </div>
  );
}
