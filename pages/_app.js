/* import css vendors */
import 'styles/landing-page/hamburger-menu.css';
import '../node_modules/animate.css/animate.css';
import 'styles/landing-page/animate-extends.css';
import 'styles/landing-page/top-loading-bar.css';
import 'styles/landing-page/page-transition.css';
import 'styles/landing-page/slick/slick.css';
import 'styles/landing-page/slick/slick-theme.css';
import 'app/components/elements/_css/root.css';
import 'react-toastify/dist/ReactToastify.css';

import CssBaseline from '@material-ui/core/CssBaseline';
import { ThemeProvider } from '@material-ui/core/styles';
import theme from 'app/modules/theme';
import { parseUserValue } from 'app/modules/user';
import { AppWrapper } from 'app/store'; // import based on where you put it
import Head from 'next/head';
import { useRouter } from 'next/router';
import { appWithTranslation } from 'next-i18next';
import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import { ToastContainer } from 'react-toastify';

import nextI18NextConfig from '../next-i18next.config.js';

const App = (props) => {
  const { Component, pageProps } = props;
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  const authCheck = (url) => {
    // redirect to login page if accessing a private page and not logged in
    const parseUser = parseUserValue();
    const publicPaths = ['/account/login', '/account/register', '/'];
    const path = url.split('?')[0];
    if (!parseUser && !publicPaths.includes(path)) {
      setAuthorized(false);
      router.push({
        pathname: '/account/login',
        query: { returnUrl: router.asPath },
      });
    } else {
      setAuthorized(true);
    }
  };

  useEffect(() => {
    // Remove the server-side injected CSS.
    const jssStyles = document.querySelector('#jss-server-side');
    if (jssStyles) {
      jssStyles.parentElement.removeChild(jssStyles);
    }

    // on initial load - run auth check
    authCheck(router.asPath);

    // on route change start - hide page content by setting authorized to false
    const hideContent = () => setAuthorized(false);
    router.events.on('routeChangeStart', hideContent);

    // on route change complete - run auth check
    router.events.on('routeChangeComplete', authCheck);

    // unsubscribe from events in useEffect return function
    return () => {
      router.events.off('routeChangeStart', hideContent);
      router.events.off('routeChangeComplete', authCheck);
    };
  }, []);

  return (
    <>
      <Head>
        <title>Puente</title>
        <meta name="viewport" content="minimum-scale=1, initial-scale=1, width=device-width" />
      </Head>
      <AppWrapper>
        <ThemeProvider theme={theme}>
          {/* CssBaseline kickstart an elegant, consistent, and simple baseline to build upon. */}
          <CssBaseline />
          {authorized
            && (
            <>
              <Component {...pageProps} />
              <ToastContainer
                autoClose={8000}
                hideProgressBar={false}
                newestOnTop={false}
                draggable={false}
                pauseOnVisibilityChange
                closeOnClick
                pauseOnHover
                closeButton={false}
              />
            </>
            )}
        </ThemeProvider>
      </AppWrapper>

    </>
  );
};

export default appWithTranslation(App, nextI18NextConfig);

App.propTypes = {
  Component: PropTypes.elementType.isRequired,
  pageProps: PropTypes.object.isRequired, //eslint-disable-line
};
