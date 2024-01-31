import ReactDOM from 'react-dom';

const PORTAL_ID = 'portal';
const PORTAL_CLASS = 'ignore-react-onclickoutside';

const Portal = ({ children }) => {
  if (!document.getElementById(PORTAL_ID)) {
    const portal = document.createElement('div');
    portal.id = PORTAL_ID;
    portal.className = PORTAL_CLASS;
    document.body.appendChild(portal);
  }

  return ReactDOM.createPortal(children, document.getElementById(PORTAL_ID));
};

export default Portal;
