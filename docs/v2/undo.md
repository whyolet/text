# Undo

## Standard

Most text editors disable "Redo" when you change the text:

* Change the text 5 times.
* Undo twice.
* Now you see version 3:

```
      Now
<-Undo | Redo->
       v
   1-2-3-4-5
```

* Press a letter on the keyboard (accidentally).
* Now you see version 6:

```
        Now
  <-Undo | Redo is disabled
         v
   1-2-3-6
```

* You can undo to version 3,
* but you CANNOT redo to version 4 or 5.
* They are lost completely,
  * unless you have a backup copy,
  * or another version history somewhere in the "Menu".

## Emacs

Emacs is an old text editor. It has no "Redo" action at all, just an unusual "Undo":

* Change the text 5 times.
* Undo twice.
* Now you see version 3:

```
      Now
<-Undo |
       |   5
       v 4
       3
     2
   1
```

* Press a letter on the keyboard (accidentally).
* Now you see version 6:

```
                Now
          <-Undo |
                 |
           5     v
         4   4   6
       3       3
     2
   1
```

* You can undo to version 3,
* and you CAN keep undoing to version 4 or 5.
* This "undoing of undone" is like "Redo".
* If you keep undoing you will see older versions too.
* Being able to undo to any version avoids data loss, nice!

* Now imagine the same example, but instead of pressing a letter on the keyboard you're just looking around by moving a cursor without changing the text.
* Emacs still treats this as a new version 6.
* "Undo" will actually redo now, which may be an unexpected behavior (UX error) if you planned to look around and keep undoing.

## Whyolet Text

Whyolet Text editor tries to have the best of both worlds:

```
        Now
  <-Undo | Redo->
         |
         v 5
         4   4   6
       3       3
     2
   1
```

* Simple separate "Undo" and "Redo".
* If you changed the text, you can undo to any version - no data loss.
* If you're just moving around without changing the text, "Undo" keeps undoing as expected.
* The latest 1000 versions are kept in the persistent local database, so if you (accidentally) close the app, you can re-open it and continue undoing/redoing.
