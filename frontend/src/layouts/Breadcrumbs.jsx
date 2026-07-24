import { useLocation, Link as RouterLink } from 'react-router-dom';
import { Breadcrumbs as MuiBreadcrumbs, Link, Typography } from '@mui/material';
import { navConfig } from './navConfig';

function findBreadcrumb(pathname) {
  for (const item of navConfig) {
    if (item.path === pathname) return [item];
    const child = item.children?.find((c) => pathname.startsWith(c.path));
    if (child) return [item, child];
  }
  return [];
}

export default function Breadcrumbs() {
  const location = useLocation();
  const trail = findBreadcrumb(location.pathname);

  if (trail.length === 0) return null;

  return (
    <MuiBreadcrumbs sx={{ mb: 2 }}>
      {trail.map((item, i) =>
        i === trail.length - 1 ? (
          <Typography key={item.label} color="text.primary" variant="body2">
            {item.label}
          </Typography>
        ) : (
          <Link key={item.label} component={RouterLink} to={item.path || '#'} underline="hover" variant="body2" color="text.secondary">
            {item.label}
          </Link>
        )
      )}
    </MuiBreadcrumbs>
  );
}
