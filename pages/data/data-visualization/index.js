// Retired in the redesign — this route now permanently redirects to the Data
// Curation page via getServerSideProps. The previous "Quick Insights" UI was
// unreachable behind the redirect, so it has been removed rather than maintained
// as dead code. Next.js still requires a default-exported component on every
// page; it never renders because the server-side redirect runs first.
export default function DataVisualizationRedirect() {
  return null;
}

export function getServerSideProps() {
  return {
    redirect: {
      destination: '/data/data-curation',
      permanent: true,
    },
  };
}
