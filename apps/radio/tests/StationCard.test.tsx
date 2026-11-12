import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StationCard } from '../src/components/StationCard';
import { useRadioStore } from '../src/stores/radio-store';
import type { Station } from '../src/types/radio';

// Mock the store
vi.mock('../src/stores/radio-store', () => ({
  useRadioStore: vi.fn(),
}));

const mockStation: Station = {
  id: '1',
  slug: 'test-station',
  name: 'Test Station',
  description: 'A test station',
  logoUrl: 'https://example.com/logo.png',
  bannerUrl: 'https://example.com/banner.png',
  streamUrl: 'https://example.com/stream.m3u8',
  streamType: 'hls',
  genre: ['electronic', 'chill'],
  language: 'en',
  country: 'us',
  isActive: true,
  sortOrder: 1,
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

describe('StationCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useRadioStore as any).mockReturnValue({
      isFavorite: vi.fn().mockReturnValue(false),
      toggleFavorite: vi.fn(),
      play: vi.fn(),
    });
  });

  it('renders station name and description', () => {
    render(<StationCard station={mockStation} />);
    expect(screen.getByText('Test Station')).toBeInTheDocument();
    expect(screen.getByText('A test station')).toBeInTheDocument();
  });

  it('renders genre tags', () => {
    render(<StationCard station={mockStation} />);
    expect(screen.getByText('electronic')).toBeInTheDocument();
    expect(screen.getByText('chill')).toBeInTheDocument();
  });

  it('calls play when play button clicked', () => {
    const mockPlay = vi.fn();
    (useRadioStore as any).mockReturnValue({
      isFavorite: vi.fn().mockReturnValue(false),
      toggleFavorite: vi.fn(),
      play: mockPlay,
    });

    render(<StationCard station={mockStation} />);
    const playButton = screen.getByLabelText('Play Test Station');
    fireEvent.click(playButton);
    expect(mockPlay).toHaveBeenCalledWith(mockStation);
  });

  it('toggles favorite when heart clicked', () => {
    const mockToggle = vi.fn();
    (useRadioStore as any).mockReturnValue({
      isFavorite: vi.fn().mockReturnValue(false),
      toggleFavorite: mockToggle,
      play: vi.fn(),
    });

    render(<StationCard station={mockStation} />);
    const favButton = screen.getByLabelText('Add Test Station to favorites');
    fireEvent.click(favButton);
    expect(mockToggle).toHaveBeenCalledWith('1');
  });

  it('shows filled heart when station is favorite', () => {
    (useRadioStore as any).mockReturnValue({
      isFavorite: vi.fn().mockReturnValue(true),
      toggleFavorite: vi.fn(),
      play: vi.fn(),
    });

    render(<StationCard station={mockStation} />);
    const favButton = screen.getByLabelText('Remove Test Station from favorites');
    expect(favButton).toBeInTheDocument();
  });

  it('renders compact variant correctly', () => {
    render(<StationCard station={mockStation} variant="compact" />);
    expect(screen.getByText('Test Station')).toBeInTheDocument();
    expect(screen.getByLabelText('Play Test Station')).toBeInTheDocument();
  });
});