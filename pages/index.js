// import LandingPage from 'app/components/epics/LandingPage';
// import Page from 'app/components/templates/website-layout';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';

import nextI18NextConfig from '../next-i18next.config.js';

const Homepage = () => (
  <div>Home</div>
  // <Page
  //   header
  //   footer
  // >
  //   <main>
  //     <div>
  //       <LandingPage />
  //     </div>
  //   </main>
  // </Page>
);

export const getStaticProps = async ({ locale }) => ({
  props: {
    ...(await serverSideTranslations(
      locale,
      ['common', 'landing'],
      nextI18NextConfig,
    )),
  },
});

export default Homepage;
