import { invoke } from "@tauri-apps/api/core";
import {
  useEffect,
  useState,
  type ImgHTMLAttributes,
  type SyntheticEvent,
} from "react";

type RemoteImageResponse = {
  data_url: string;
};

type RemoteImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  src?: string;
  fallbackSrc?: string;
};

const imageCache = new Map<string, Promise<string>>();

function isRemoteSource(src?: string) {
  return Boolean(src && /^(https|file):\/\//i.test(src));
}

function loadRemoteSource(src: string) {
  const cached = imageCache.get(src);
  if (cached) return cached;

  const request = invoke<RemoteImageResponse>("fetch_remote_image", {
    request: { url: src },
  }).then((response) => response.data_url);
  imageCache.set(src, request);
  request.catch(() => imageCache.delete(src));
  return request;
}

export function RemoteImage({
  src,
  fallbackSrc,
  onError,
  ...props
}: RemoteImageProps) {
  const [resolvedSrc, setResolvedSrc] = useState(src ?? fallbackSrc);

  useEffect(() => {
    let active = true;
    if (!src) {
      setResolvedSrc(fallbackSrc);
      return () => {
        active = false;
      };
    }

    if (!isRemoteSource(src)) {
      setResolvedSrc(src);
      return () => {
        active = false;
      };
    }

    // Local ES-DE paths must go through Tauri. WebKit blocks file:// sources in
    // some Bazzite/Tauri builds even when the file exists and is readable.
    setResolvedSrc(/^file:\/\//i.test(src) ? fallbackSrc : src);
    loadRemoteSource(src)
      .then((dataUrl) => {
        if (active) setResolvedSrc(dataUrl);
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, [fallbackSrc, src]);

  const handleError = (event: SyntheticEvent<HTMLImageElement>) => {
    if (fallbackSrc && event.currentTarget.src !== fallbackSrc) {
      setResolvedSrc(fallbackSrc);
    }
    onError?.(event);
  };

  if (!resolvedSrc) return null;

  return <img {...props} src={resolvedSrc} onError={handleError} />;
}
