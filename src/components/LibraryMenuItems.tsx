import React, { useState } from "react";
import { serializeLibraryAsJSON } from "../data/json";
import { ExcalidrawElement, NonDeleted } from "../element/types";
import { t } from "../i18n";
import { LibraryItem, LibraryItems } from "../types";
import { arrayToMap, chunk } from "../utils";
import { LibraryUnit } from "./LibraryUnit";
import Stack from "./Stack";

import "./LibraryMenuItems.scss";
import { MIME_TYPES } from "../constants";
import Spinner from "./Spinner";

const CELLS_PER_ROW = 4;

const LibraryMenuItems = ({
  isLoading,
  libraryItems,
  onAddToLibrary,
  onInsertLibraryItems,
  pendingElements,
  selectedItems,
  onSelectItems,
}: {
  isLoading: boolean;
  libraryItems: LibraryItems;
  pendingElements: LibraryItem["elements"];
  onInsertLibraryItems: (libraryItems: LibraryItems) => void;
  onAddToLibrary: (elements: LibraryItem["elements"]) => void;
  selectedItems: LibraryItem["id"][];
  onSelectItems: (id: LibraryItem["id"][]) => void;
}) => {
  const [lastSelectedItem, setLastSelectedItem] = useState<
    LibraryItem["id"] | null
  >(null);

  const onItemSelectToggle = (
    id: LibraryItem["id"],
    event: React.MouseEvent,
  ) => {
    const shouldSelect = !selectedItems.includes(id);

    const orderedItems = [...unpublishedItems, ...publishedItems];

    if (shouldSelect) {
      if (event.shiftKey && lastSelectedItem) {
        const rangeStart = orderedItems.findIndex(
          (item) => item.id === lastSelectedItem,
        );
        const rangeEnd = orderedItems.findIndex((item) => item.id === id);

        if (rangeStart === -1 || rangeEnd === -1) {
          onSelectItems([...selectedItems, id]);
          return;
        }

        const selectedItemsMap = arrayToMap(selectedItems);
        const nextSelectedIds = orderedItems.reduce(
          (acc: LibraryItem["id"][], item, idx) => {
            if (
              (idx >= rangeStart && idx <= rangeEnd) ||
              selectedItemsMap.has(item.id)
            ) {
              acc.push(item.id);
            }
            return acc;
          },
          [],
        );

        onSelectItems(nextSelectedIds);
      } else {
        onSelectItems([...selectedItems, id]);
      }
      setLastSelectedItem(id);
    } else {
      setLastSelectedItem(null);
      onSelectItems(selectedItems.filter((_id) => _id !== id));
    }
  };

  const getInsertedElements = (id: string) => {
    let targetElements;
    if (selectedItems.includes(id)) {
      targetElements = libraryItems.filter((item) =>
        selectedItems.includes(item.id),
      );
    } else {
      targetElements = libraryItems.filter((item) => item.id === id);
    }
    return targetElements;
  };

  const createLibraryItemCompo = (params: {
    item:
      | LibraryItem
      | /* pending library item */ {
          id: null;
          elements: readonly NonDeleted<ExcalidrawElement>[];
        }
      | null;
    onClick?: () => void;
    key: string;
  }) => {
    return (
      <Stack.Col key={params.key}>
        <LibraryUnit
          elements={params.item?.elements}
          isPending={!params.item?.id && !!params.item?.elements}
          onClick={params.onClick || (() => {})}
          id={params.item?.id || null}
          selected={!!params.item?.id && selectedItems.includes(params.item.id)}
          onToggle={onItemSelectToggle}
          onDrag={(id, event) => {
            event.dataTransfer.setData(
              MIME_TYPES.excalidrawlib,
              serializeLibraryAsJSON(getInsertedElements(id)),
            );
          }}
        />
      </Stack.Col>
    );
  };

  const renderLibrarySection = (
    items: (
      | LibraryItem
      | /* pending library item */ {
          id: null;
          elements: readonly NonDeleted<ExcalidrawElement>[];
        }
    )[],
  ) => {
    const _items = items.map((item) => {
      if (item.id) {
        return createLibraryItemCompo({
          item,
          onClick: () => onInsertLibraryItems(getInsertedElements(item.id)),
          key: item.id,
        });
      }
      return createLibraryItemCompo({
        key: "__pending__item__",
        item,
        onClick: () => onAddToLibrary(pendingElements),
      });
    });

    // ensure we render all empty cells if no items are present
    let rows = chunk(_items, CELLS_PER_ROW);
    if (!rows.length) {
      rows = [[]];
    }

    return rows.map((rowItems, index, rows) => {
      if (index === rows.length - 1) {
        // pad row with empty cells
        rowItems = rowItems.concat(
          new Array(CELLS_PER_ROW - rowItems.length)
            .fill(null)
            .map((_, index) => {
              return createLibraryItemCompo({
                key: `empty_${index}`,
                item: null,
              });
            }),
        );
      }
      return (
        <Stack.Row align="center" gap={1} key={index}>
          {rowItems}
        </Stack.Row>
      );
    });
  };

  const unpublishedItems = libraryItems.filter(
    (item) => item.status !== "published",
  );
  const publishedItems = libraryItems.filter(
    (item) => item.status === "published",
  );

  return (
    <div
      className="library-menu-items-container"
      style={
        publishedItems.length || unpublishedItems.length
          ? {
              flex: "1 1 0",
              overflowY: "auto",
            }
          : {
              marginBottom: "2rem",
              flex: 0,
            }
      }
    >
      <Stack.Col
        className="library-menu-items-container__items"
        align="start"
        gap={1}
        style={{
          flex: publishedItems.length > 0 ? 1 : "0 1 auto",
          marginBottom: 0,
        }}
      >
        <>
          <div className="separator">
            {(pendingElements.length > 0 ||
              unpublishedItems.length > 0 ||
              publishedItems.length > 0) && (
              <div>{t("labels.personalLib")}</div>
            )}
            {isLoading && (
              <div
                style={{
                  marginLeft: "auto",
                  marginRight: "1rem",
                  display: "flex",
                  alignItems: "center",
                  fontWeight: "normal",
                }}
              >
                <div style={{ transform: "translateY(2px)" }}>
                  <Spinner />
                </div>
              </div>
            )}
          </div>
          {!pendingElements.length && !unpublishedItems.length ? (
            <div
              style={{
                height: 65,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                width: "100%",
                fontSize: ".9rem",
              }}
            >
              {t("library.noItems")}
              <div
                style={{
                  margin: ".6rem 0",
                  fontSize: ".8em",
                  width: "70%",
                  textAlign: "center",
                }}
              >
                {publishedItems.length > 0
                  ? t("library.hint_emptyPrivateLibrary")
                  : t("library.hint_emptyLibrary")}
              </div>
            </div>
          ) : (
            renderLibrarySection([
              // append pending library item
              ...(pendingElements.length
                ? [{ id: null, elements: pendingElements }]
                : []),
              ...unpublishedItems,
            ])
          )}
        </>

        <>
          {(publishedItems.length > 0 ||
            pendingElements.length > 0 ||
            unpublishedItems.length > 0) && (
            <div className="separator">{t("labels.excalidrawLib")}</div>
          )}
          {publishedItems.length > 0 ? (
            renderLibrarySection(publishedItems)
          ) : unpublishedItems.length > 0 ? (
            <div
              style={{
                margin: "1rem 0",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                width: "100%",
                fontSize: ".9rem",
              }}
            >
              {t("library.noItems")}
            </div>
          ) : null}
        </>
      </Stack.Col>
    </div>
  );
};

export default LibraryMenuItems;