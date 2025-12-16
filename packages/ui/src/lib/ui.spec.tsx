import { render, screen } from '@testing-library/react';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Skeleton } from './ui';

describe('UI primitives', () => {
  it('renders a button', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText(/click me/i)).toBeInTheDocument();
  });

  it('renders a card', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Test</CardTitle>
        </CardHeader>
        <CardContent>Body</CardContent>
      </Card>,
    );
    expect(screen.getByText('Test')).toBeInTheDocument();
    expect(screen.getByText('Body')).toBeInTheDocument();
  });

  it('renders form bits', () => {
    render(
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" placeholder="email@example.com" />
      </div>,
    );
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
  });

  it('renders badge and skeleton', () => {
    render(
      <div>
        <Badge>Badge</Badge>
        <Skeleton className="h-2 w-4" />
      </div>,
    );
    expect(screen.getByText('Badge')).toBeInTheDocument();
  });
});
