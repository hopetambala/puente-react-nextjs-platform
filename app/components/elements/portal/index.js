import ReactDOM from 'react-dom';

// interface IProps {
//   /** Contents to put within the portal. */
//   children?: React.ReactNode;
// }

const PORTAL_ID = 'portal';
const PORTAL_CLASS = 'ignore-react-onclickoutside';

const Portal = ({ children }) => {
  if (!document.getElementById(PORTAL_ID)) {
    const portal = document.createElement('div');
    portal.id = PORTAL_ID;
    portal.className = PORTAL_CLASS;
    document.body.appendChild(portal);
  }

  // return ReactDOM.createPortal(children, document.getElementById(PORTAL_ID)!);
  return ReactDOM.createPortal(children, document.getElementById(PORTAL_ID));
};

export default Portal;
