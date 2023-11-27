import Button from '@material-ui/core/Button';
import Menu from '@material-ui/core/Menu';
import MenuItem from '@material-ui/core/MenuItem';
import React, { useEffect, useState } from 'react';

import retrieveAllFormResults from '../_data';

const FormMenu = ({
  setFormType, formType, formValue, setFormValue, setParams, organization, setCsvData,
}) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);
  const [menuItems, setMenuItems] = useState([
    {
      key: 'SurveyData', value: 'Survey Data', isCustomForm: false, isAssetForm: false,
    },
    {
      key: 'Vitals', value: 'Vitals', isCustomForm: false, isAssetForm: false,
    },
    {
      key: 'Assets', value: 'Assets', isCustomForm: false, isAssetForm: false,
    },
    {
      key: 'EvaluationMedical', value: 'Medical Evaluation', isCustomForm: false, isAssetForm: false,
    },
    {
      key: 'HistoryEnvironmentalHealth', value: 'History Environmental Health', isCustomForm: false, isAssetForm: false,
    },
  ]);

  const getCustomFormNames = (records) => {
    records.forEach((record) => {
      if (record.active !== 'false') {
        let customForm = {};
        const tempMenuItems = menuItems;
        if (record.typeOfForm.includes('Assets')) {
          customForm = {
            key: record.objectId.toString(), value: `${record.name.toString()} - Asset`, isCustomForm: true, isAssetForm: true,
          };
        } else {
          customForm = {
            key: record.objectId.toString(), value: `${record.name.toString()} - Custom`, isCustomForm: true, isAssetForm: false,
          };
        }
        tempMenuItems.push(customForm);
        setMenuItems(tempMenuItems);
      }
    });
  };

  const getCustomFormTypes = () => retrieveAllFormResults('FormSpecificationsV2', {
    organizations: organization,
  }).then((records) => {
    getCustomFormNames(records);
  }, (error) => {
    console.log(`Error: ${error}`); //eslint-disable-line
  });

  useEffect(() => {
    getCustomFormTypes();
  }, [organization]);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = (menuItem) => {
    if (menuItem.isCustomForm === true) {
      if (menuItem.isAssetForm === true) {
        setFormType('FormAssetResults');
      } else {
        setFormType('FormResults');
      }
      setFormValue(menuItem.value);
      setParams({ formSpecificationsId: menuItem.key, surveyingOrganization: organization });
    } else if (menuItem.isCustomForm === false) {
      setFormType(menuItem.key);
      setFormValue(menuItem.value);
      setParams({ surveyingOrganization: organization });
    }
    setCsvData([]);
    setAnchorEl(null);
  };

  return (
    <div>

      <Button
        id="demo-positioned-button"
        aria-controls="demo-positioned-menu"
        aria-haspopup="true"
        aria-expanded={open ? 'true' : undefined}
        onClick={handleClick}
      >
        <div>{formType && (<div>{formValue}</div>)}</div>
      </Button>
      <Menu
        id="demo-positioned-menu"
        aria-labelledby="demo-positioned-button"
        anchorEl={anchorEl}
        open={open}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
      >
        {menuItems.length > 0 && menuItems.map((item) => (

          <MenuItem
            onClick={() => handleClose(item)}
            key={item.key}
          >
            {item && (<div>{item.value}</div>)}
          </MenuItem>
        ))}
      </Menu>
    </div>
  );
};
export default FormMenu;
