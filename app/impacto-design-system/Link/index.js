import NextLink from 'next/link';
import PropTypes from 'prop-types';

/**
 * A Next.js link rendered as a real <a>. `shouldOpenHrefInNewTab` becomes
 * target/rel; it used to be spread onto the <a> as an unknown attribute, so
 * the tab never opened.
 */
const Link = ({
  href, children, shouldOpenHrefInNewTab, ...props
}) => (
  <NextLink href={href} passHref>
    <a
      {...props}
      {...(shouldOpenHrefInNewTab ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
    >
      {children}
    </a>
  </NextLink>
);

Link.propTypes = {
  children: PropTypes.node.isRequired,
  href: PropTypes.string.isRequired,
  shouldOpenHrefInNewTab: PropTypes.bool,
};

Link.defaultProps = {
  shouldOpenHrefInNewTab: false,
};

export default Link;
