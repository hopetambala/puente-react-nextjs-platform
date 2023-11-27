import { Card, Page, Text } from 'app/impacto-design-system';
import { updateUser } from 'app/modules/user';
import { useRouter } from 'next/router';
import { useEffect } from 'react';

const Verify = () => {
  const router = useRouter();

  const { objectId: userId } = router.query;

  const updateVerificationStatus = async () => {
    const updatedUser = {
      adminVerified: true,
    };
    await updateUser(userId, updatedUser);
  };

  const redirect = async () => {
    await updateVerificationStatus();
    router.push(`/account/verify?objectId=${userId}`);
  };

  useEffect(() => {
    const verify = async () => {
      if (userId) redirect();
    };
    verify();
    if (!userId) router.push('/account/login');
  }, [userId]);

  return (
    <Page>
      <Card padding="extraLarge">
        <Text text="Hold On" element="h1" />
      </Card>
    </Page>
  );
};

export default Verify;
