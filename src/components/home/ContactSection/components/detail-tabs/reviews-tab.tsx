import React from "react";
import { Icon } from "@iconify/react";
import { CustomImage } from "@/components/ui/image";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Outing } from "@/types";

interface ReviewsTabProps {
  outing: Outing;
}

export const ReviewsTab: React.FC<ReviewsTabProps> = ({ outing }) => {
  return (
    <div className="space-y-3 sm:space-y-4 p-4 sm:p-6 md:p-8">
      {outing.reviews && outing.reviews.length > 0 ? (
        <div className="space-y-4">
          {outing.reviews.map((review, index) => (
            <div
              key={index}
              className={`${index !== 0 ? "border-t border-border pt-4" : ""}`}
            >
              <div className="flex items-start gap-3">
                {review.profilePhoto && (
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={review.profilePhoto} alt={review.author} />
                    <AvatarFallback>{review.author[0]}</AvatarFallback>
                  </Avatar>
                )}
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">{review.author}</h4>
                    <span className="text-sm text-muted-foreground">
                      {review.time}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Icon
                        key={i}
                        icon="lucide:star"
                        className={
                          i < review.rating
                            ? "text-yellow-500 fill-yellow-500"
                            : "text-muted-foreground"
                        }
                        width={16}
                        height={16}
                      />
                    ))}
                  </div>
                  <p className="mt-2 text-foreground">{review.text}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Icon
            icon="lucide:message-square"
            className="mb-2 text-muted-foreground"
            width={40}
            height={40}
          />
          <p className="text-muted-foreground">
            No reviews available for this place.
          </p>
        </div>
      )}
    </div>
  );
};
