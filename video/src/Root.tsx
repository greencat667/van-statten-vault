import { MyComposition } from "./Composition";
import { ShortComposition } from "./Short";
import { ThumbnailCompositions } from "./Thumbnail";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <MyComposition />
      <ShortComposition />
      <ThumbnailCompositions />
    </>
  );
};
