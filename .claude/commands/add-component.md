---
description: Create a new React component following Marginalia patterns
---

Create a new React component with the following requirements:

## Component Structure

1. **Functional component** with TypeScript
2. **Props interface** explicitly defined
3. **Hooks only** - no class syntax
4. **Tailwind utilities** for styling (no custom CSS)
5. **lucide-react** for icons if needed

## File Location

- If UI component: Add to `src/App.tsx` or `src/options.tsx` (inline)
- If reusable: Consider if it really needs to be separate

## Example Pattern

```typescript
interface ComponentNameProps {
  prop1: string;
  prop2?: number;
  onClick: () => void;
}

export const ComponentName = ({ prop1, prop2 = 0, onClick }: ComponentNameProps) => {
  const [state, setState] = useState('');
  
  useEffect(() => {
    // Setup with cleanup
    return () => {
      // Cleanup
    };
  }, []);
  
  return (
    <div className="flex flex-col gap-3 p-4">
      {/* Component content */}
    </div>
  );
};
```

## Testing

Create tests in `tests/components/`:
- Test rendering
- Test user interactions
- Test props handling
- Mock browser APIs if needed

Component name: $ARGUMENTS