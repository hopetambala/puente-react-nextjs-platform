import FormManager from 'app/components/epics/FormManager';
import Page from 'app/components/templates/dashboard-layout';
import { UserContext } from 'app/store/auth.context';
import { useGlobalState } from 'app/store/global.context';
import { useRouter } from 'next/router';
import { useContext } from 'react';

export default function Manager() {
  const { contextManagment } = useGlobalState();
  const router = useRouter();
  const {
    user, isLoading: isUserLoading, error: userError,
  } = useContext(UserContext);

  return (
    <Page
      header
      footer
    >
      <main className="container">
        <div>Form Manager</div>
        <FormManager
          router={router}
          context={contextManagment}
          user={user}
          isUserLoading={isUserLoading}
          userError={userError}
        />
        <style jsx>
          {`

        
        .container {
          min-height: 100vh;
          padding: 0 0.5rem;
          flex-direction: column;
          justify-content: center;
          align-items: center;
        }

        main {
          padding: 5rem 0;
          flex: 1;
        }

        .title a {
          color: #0070f3;
          text-decoration: none;
        }

        .title a:hover,
        .title a:focus,
        .title a:active {
          text-decoration: underline;
        }

        .title {
          margin: 0;
          line-height: 1.15;
          font-size: 4rem;
        }

        .title,
        .description {
          text-align: center;
        }

        .description {
          line-height: 1.5;
          font-size: 1.5rem;
        }

        .grid {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-wrap: wrap;

          max-width: 800px;
          margin-top: 3rem;
        }

        .logo {
          height: 1em;
        }

        @media (max-width: 600px) {
          .grid {
            width: 100%;
            flex-direction: column;
          }
        }
      `}
        </style>
      </main>
    </Page>
  );
}
