import CssBaseline from '@material-ui/core/CssBaseline';
// import Hidden from '@material-ui/core/Hidden';
import { makeStyles } from '@material-ui/core/styles';
import {
  Banner,
  // CompanyLogo,
  // Counter,
  Faq,
  // Feature,
  FooterWithDeco,
  Header,
  // NewsEvent,
  // Notification,
  // PageNav,
  PricingPlan,
  // Testimonials,
} from 'app/components/molecules/website';
// import clsx from 'clsx';
import Head from 'next/head';
import React from 'react';

const sectionMargin = (margin) => (margin * 20);
const useStyles = makeStyles((theme) => ({
  mainWrap: {
    position: 'relative',
    width: '100%',
    overflow: 'hidden',
    background: theme.palette.type === 'dark' ? theme.palette.background.default : theme.palette.background.paper,
  },
  spaceBottom: {
    marginBottom: sectionMargin(theme.spacing()),
    [theme.breakpoints.down('sm')]: {
      marginBottom: sectionMargin(6),
    },
  },
  spaceBottomTesti: {
    [theme.breakpoints.up('md')]: {
      marginBottom: sectionMargin(theme.spacing()),
    },
  },
  spaceBottomShort: {
    marginBottom: sectionMargin(theme.spacing() / 2),
  },
  spaceTop: {
    marginTop: sectionMargin(theme.spacing()),
    [theme.breakpoints.down('sm')]: {
      marginTop: sectionMargin(6),
    },
  },
  spaceTopShort: {
    marginTop: sectionMargin(theme.spacing() / 2),
  },
  containerWrap: {
    marginTop: -40,
    '& > section': {
      position: 'relative',
    },
  },
}));

function Landing() {
  const classes = useStyles();
  return (
    <>
      <Head>
        <title>
          Puente Technology
          &nbsp; - Home Page
        </title>
      </Head>
      <CssBaseline />
      <section id="home" />
      <div className={classes.mainWrap}>
        <Header />
        <main className={classes.containerWrap}>
          <section id="home">
            <Banner />
          </section>
          {/* <section>
            <CompanyLogo />
          </section>
          <section>
            <Counter />
          </section> */}
          {/* <section id="feature" className={classes.spaceTop}>
            <Feature />
          </section> */}
          {/* <section id="testimonials" className={classes.spaceBottomTesti}>
            <Testimonials />
          </section> */}
          <section id="pricing" className={classes.spaceTop}>
            <PricingPlan />
          </section>
          <section id="faq" className={classes.spaceTopShort}>
            <Faq />
          </section>
          {/* <div className={clsx(classes.spaceTopShort, classes.spaceBottomShort)}>
            <NewsEvent />
          </div> */}
        </main>
        <section id="footer">
          <FooterWithDeco />
        </section>
        {/* <Hidden mdDown>
          <Notification />
        </Hidden>
        <Hidden mdDown>
          <PageNav />
        </Hidden> */}
      </div>
    </>
  );
}

Landing.getInitialProps = async () => ({
  namespacesRequired: ['common', 'saas-landing'],
});

export default Landing;
