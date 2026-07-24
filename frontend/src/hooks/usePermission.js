import { useSelector } from 'react-redux';
import { selectPermissions } from '../features/auth/authSlice';

// usePermission('po:create') -> boolean
// usePermission(['po:create', 'po:update']) -> true if ANY are granted
export function usePermission(keyOrKeys) {
  const granted = useSelector(selectPermissions);
  const keys = Array.isArray(keyOrKeys) ? keyOrKeys : [keyOrKeys];
  return keys.some((key) => granted.includes(key));
}
